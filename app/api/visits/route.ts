import { createHash } from "node:crypto";

import sharp from "sharp";

import { createClient } from "../../../lib/supabase/server";
import { createServiceRoleClient } from "../../../lib/supabase/service";
import { validateVisitLocation } from "../../lib/visit-verification";
import { allExperiences } from "../../product/catalogue";
import { gemDropAlternativeFor } from "../../product/gemdrop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VISIT_EVIDENCE_BUCKET = "visit-evidence";
const VALIDATION_VERSION = "2026-08-25";
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_MULTIPART_BYTES = MAX_UPLOAD_BYTES + 256 * 1024;
const MAX_INPUT_PIXELS = 40_000_000;
const MAX_NORMALIZED_EDGE = 2048;

type VisitRpcResult = {
  verification_id: string;
  verification_status: "verified";
  awarded_now: number;
  balance: number;
  accepted_gemdrop: boolean;
  points_awarded: number;
  verified_at: string;
};

class VisitRequestError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
  }
}

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      "cache-control": "private, no-store, max-age=0",
      pragma: "no-cache",
    },
  });

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

const isSafeIdentifier = (value: string) =>
  value.length > 0 && value.length <= 160 && /^[A-Za-z0-9._:-]+$/.test(value);

const sameOrigin = (request: Request) => {
  const requestOrigin = new URL(request.url).origin;
  const suppliedOrigin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (suppliedOrigin !== requestOrigin || fetchSite === "cross-site") {
    throw new VisitRequestError("cross_site_request", 403);
  }
};

const authenticatedUserId = async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || data.user.is_anonymous === true) {
    throw new VisitRequestError("authentication_required", 401);
  }
  return data.user.id;
};

const cleanText = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
};

const finiteNumber = (form: FormData, key: string) => {
  const raw = cleanText(form, key);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
};

const normalizePhoto = async (photo: File) => {
  if (
    photo.size <= 0 ||
    photo.size > MAX_UPLOAD_BYTES ||
    !["image/jpeg", "image/png", "image/webp"].includes(photo.type)
  ) {
    throw new VisitRequestError(
      photo.size > MAX_UPLOAD_BYTES ? "image_too_large" : "invalid_file_type",
      photo.size > MAX_UPLOAD_BYTES ? 413 : 400,
    );
  }

  const input = Buffer.from(await photo.arrayBuffer());
  if (input.byteLength <= 0 || input.byteLength > MAX_UPLOAD_BYTES) {
    throw new VisitRequestError(
      input.byteLength > MAX_UPLOAD_BYTES ? "image_too_large" : "invalid_image",
      input.byteLength > MAX_UPLOAD_BYTES ? 413 : 400,
    );
  }

  try {
    const image = sharp(input, {
      animated: false,
      failOn: "error",
      limitInputPixels: MAX_INPUT_PIXELS,
    });
    const metadata = await image.metadata();
    const declaredFormat = {
      "image/jpeg": "jpeg",
      "image/png": "png",
      "image/webp": "webp",
    }[photo.type];
    if (
      !metadata.format ||
      metadata.format !== declaredFormat ||
      (metadata.pages ?? 1) > 1
    ) {
      throw new VisitRequestError("invalid_file_type", 400);
    }

    // rotate() applies orientation. Omitting withMetadata() strips EXIF,
    // embedded GPS and camera identifiers from the private stored evidence.
    const normalized = await image
      .rotate()
      .resize({
        width: MAX_NORMALIZED_EDGE,
        height: MAX_NORMALIZED_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82, effort: 5, smartSubsample: true })
      .toBuffer({ resolveWithObject: true });
    const { width, height, size } = normalized.info;
    if (!width || !height || width < 320 || height < 240) {
      throw new VisitRequestError("image_too_small", 400);
    }
    if (size <= 0 || size > MAX_UPLOAD_BYTES) {
      throw new VisitRequestError("image_too_large", 413);
    }
    const pixels = await sharp(normalized.data)
      .greyscale()
      .resize(9, 8, { fit: "fill" })
      .raw()
      .toBuffer();
    let differenceHash = BigInt(0);
    for (let row = 0; row < 8; row += 1) {
      for (let column = 0; column < 8; column += 1) {
        differenceHash =
          (differenceHash << BigInt(1)) |
          (pixels[row * 9 + column] > pixels[row * 9 + column + 1]
            ? BigInt(1)
            : BigInt(0));
      }
    }
    const signedDifferenceHash =
      differenceHash >= BigInt(1) << BigInt(63)
        ? differenceHash - (BigInt(1) << BigInt(64))
        : differenceHash;
    return {
      bytes: normalized.data,
      width,
      height,
      size,
      sha256: createHash("sha256").update(normalized.data).digest("hex"),
      perceptualHash: signedDifferenceHash.toString(),
    };
  } catch (error) {
    if (error instanceof VisitRequestError) throw error;
    throw new VisitRequestError("invalid_image", 400);
  }
};

const isExistingStorageObject = (error: {
  statusCode?: string | number;
  message?: string;
}) =>
  Number(error.statusCode) === 409 ||
  /already exists|duplicate/i.test(error.message ?? "");

const existingObjectMatches = async (
  service: ReturnType<typeof createServiceRoleClient>,
  objectPath: string,
  expected: Awaited<ReturnType<typeof normalizePhoto>>,
) => {
  const { data, error } = await service.storage
    .from(VISIT_EVIDENCE_BUCKET)
    .download(objectPath);
  if (error || !data) return false;
  const bytes = Buffer.from(await data.arrayBuffer());
  if (
    bytes.byteLength !== expected.size ||
    createHash("sha256").update(bytes).digest("hex") !== expected.sha256
  ) {
    return false;
  }
  try {
    const metadata = await sharp(bytes, {
      animated: false,
      failOn: "error",
      limitInputPixels: MAX_INPUT_PIXELS,
    }).metadata();
    return (
      metadata.format === "webp" &&
      metadata.width === expected.width &&
      metadata.height === expected.height
    );
  } catch {
    return false;
  }
};

const mapServiceError = (error: {
  code?: string;
  message?: string;
  details?: string;
}) => {
  const evidence = `${error.code ?? ""} ${error.message ?? ""} ${error.details ?? ""}`;
  if (/verified_account_required|authentication_required/i.test(evidence)) {
    return new VisitRequestError("authentication_required", 401);
  }
  if (/account_deletion_pending/i.test(evidence)) {
    return new VisitRequestError("account_deletion_pending", 409);
  }
  if (/trip_not_found|trip_stop_not_found|trip_original_stop_not_found/i.test(evidence)) {
    return new VisitRequestError("trip_not_found", 404);
  }
  if (/visit_rate_limit/i.test(evidence)) {
    return new VisitRequestError("visit_rate_limit", 429);
  }
  if (/visit_cooldown/i.test(evidence)) {
    return new VisitRequestError("visit_cooldown", 409);
  }
  if (/duplicate_visit_photo/i.test(evidence)) {
    return new VisitRequestError("duplicate_visit_photo", 409);
  }
  if (/idempotency_conflict|gemdrop_acceptance_conflict|23505/i.test(evidence)) {
    return new VisitRequestError("idempotency_conflict", 409);
  }
  if (/invalid_visit_evidence|invalid_gemdrop_acceptance|22023/i.test(evidence)) {
    return new VisitRequestError("invalid_visit_evidence", 400);
  }
  return new VisitRequestError("verification_unavailable", 503);
};

const serviceClient = () => {
  try {
    return createServiceRoleClient();
  } catch {
    throw new VisitRequestError("verification_unavailable", 503);
  }
};

export async function PUT(request: Request) {
  try {
    sameOrigin(request);
    if (!request.headers.get("content-type")?.includes("application/json")) {
      throw new VisitRequestError("json_required", 415);
    }
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > 8192) {
      throw new VisitRequestError("invalid_gemdrop_acceptance", 400);
    }
    const userId = await authenticatedUserId();
    const body = (await request.json().catch(() => null)) as {
      acceptanceId?: unknown;
      tripId?: unknown;
      originalExperienceId?: unknown;
      alternativeExperienceId?: unknown;
    } | null;
    const acceptanceId =
      typeof body?.acceptanceId === "string" ? body.acceptanceId.trim() : "";
    const tripId = typeof body?.tripId === "string" ? body.tripId.trim() : "";
    const originalId =
      typeof body?.originalExperienceId === "string"
        ? body.originalExperienceId.trim()
        : "";
    const alternativeId =
      typeof body?.alternativeExperienceId === "string"
        ? body.alternativeExperienceId.trim()
        : "";
    if (
      !isUuid(acceptanceId) ||
      !isSafeIdentifier(tripId) ||
      !isSafeIdentifier(originalId) ||
      !isSafeIdentifier(alternativeId)
    ) {
      throw new VisitRequestError("invalid_gemdrop_acceptance", 400);
    }

    const original = allExperiences.find((item) => item.id === originalId);
    const expected = original
      ? gemDropAlternativeFor(allExperiences, original)
      : null;
    if (!original || !expected || expected.id !== alternativeId) {
      throw new VisitRequestError("invalid_gemdrop_acceptance", 400);
    }

    const service = serviceClient();
    const { data, error } = await service.rpc("record_gemdrop_acceptance", {
      p_id: acceptanceId,
      p_user_id: userId,
      p_trip_id: tripId,
      p_original_experience_id: originalId,
      p_alternative_experience_id: alternativeId,
    });
    if (error) throw mapServiceError(error);
    const acceptance = Array.isArray(data) ? data[0] : data;
    if (!acceptance?.acceptance_id || !acceptance.accepted_at) {
      throw new VisitRequestError("verification_unavailable", 503);
    }
    return json({ acceptance });
  } catch (error) {
    if (error instanceof VisitRequestError) {
      return json({ error: error.code }, error.status);
    }
    return json({ error: "verification_unavailable" }, 503);
  }
}

export async function POST(request: Request) {
  let uploadedObject: string | null = null;
  let uploadedByThisRequest = false;
  let service: ReturnType<typeof createServiceRoleClient> | null = null;
  try {
    sameOrigin(request);
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_MULTIPART_BYTES) {
      throw new VisitRequestError("image_too_large", 413);
    }
    if (!request.headers.get("content-type")?.includes("multipart/form-data")) {
      throw new VisitRequestError("multipart_required", 415);
    }

    const userId = await authenticatedUserId();
    service = serviceClient();
    const form = await request.formData().catch(() => null);
    if (!form) throw new VisitRequestError("invalid_visit_evidence", 400);

    const clientRequestId = cleanText(form, "clientRequestId");
    const tripId = cleanText(form, "tripId");
    const experienceId = cleanText(form, "experienceId");
    const consent = cleanText(form, "consent");
    const latitude = finiteNumber(form, "locationLatitude");
    const longitude = finiteNumber(form, "locationLongitude");
    const accuracy = finiteNumber(form, "locationAccuracy");
    const capturedAt = cleanText(form, "locationCapturedAt");
    const photo = form.get("photo");
    if (
      !isUuid(clientRequestId) ||
      !isSafeIdentifier(tripId) ||
      !isSafeIdentifier(experienceId) ||
      consent !== "true" ||
      latitude === null ||
      longitude === null ||
      accuracy === null ||
      !photo ||
      !(photo instanceof File)
    ) {
      throw new VisitRequestError("invalid_visit_evidence", 400);
    }
    // Only IDs cross the client boundary. Coordinates always come from the
    // immutable server bundle, never from a submitted destination location.
    const destination = allExperiences.find((item) => item.id === experienceId);
    if (!destination) {
      throw new VisitRequestError("destination_not_found", 404);
    }
    const locationValidation = validateVisitLocation(
      { latitude, longitude, accuracy, capturedAt },
      {
        latitude: destination.latitude,
        longitude: destination.longitude,
      },
    );
    if (!locationValidation.ok) {
      throw new VisitRequestError(locationValidation.error, 422);
    }
    const { distanceM } = locationValidation;

    const normalized = await normalizePhoto(photo);
    const objectPath = `${userId}/${clientRequestId}/arrival.webp`;
    uploadedObject = objectPath;
    const { error: uploadError } = await service.storage
      .from(VISIT_EVIDENCE_BUCKET)
      .upload(objectPath, normalized.bytes, {
        cacheControl: "3600",
        contentType: "image/webp",
        upsert: false,
      });
    if (uploadError) {
      if (
        !isExistingStorageObject(uploadError) ||
        !(await existingObjectMatches(service, objectPath, normalized))
      ) {
        throw new VisitRequestError(
          isExistingStorageObject(uploadError)
            ? "idempotency_conflict"
            : "verification_upload_failed",
          isExistingStorageObject(uploadError) ? 409 : 503,
        );
      }
    } else {
      uploadedByThisRequest = true;
    }

    const { data, error } = await service.rpc("record_verified_visit", {
      p_id: clientRequestId,
      p_user_id: userId,
      p_trip_id: tripId,
      p_experience_id: experienceId,
      p_object_path: objectPath,
      p_photo_sha256: normalized.sha256,
      p_photo_perceptual_hash: normalized.perceptualHash,
      p_byte_size: normalized.size,
      p_width: normalized.width,
      p_height: normalized.height,
      p_location_accuracy_m: accuracy,
      p_distance_m: distanceM,
      p_location_captured_at: locationValidation.capturedAt,
      p_validation_version: VALIDATION_VERSION,
    });
    if (error) {
      // If the database committed but the RPC response was lost, recover the
      // authoritative row only when every request-bound field still matches.
      // A failed recovery lookup is ambiguous, so preserve the private object
      // for a safe retry rather than risk deleting committed evidence.
      const { data: recovered, error: recoveryError } = await service
        .from("visit_verification_evidence")
        .select(
          "verification_id,accepted_gemdrop,points_awarded,created_at",
        )
        .eq("user_id", userId)
        .eq("client_request_id", clientRequestId)
        .eq("trip_id", tripId)
        .eq("experience_id", experienceId)
        .eq("object_path", objectPath)
        .eq("photo_sha256", normalized.sha256)
        .eq("photo_perceptual_hash", normalized.perceptualHash)
        .eq("byte_size", normalized.size)
        .eq("width", normalized.width)
        .eq("height", normalized.height)
        .eq("location_accuracy_m", accuracy)
        .eq("distance_m", distanceM)
        .eq("location_captured_at", locationValidation.capturedAt)
        .eq("validation_version", VALIDATION_VERSION)
        .maybeSingle();
      if (recoveryError) {
        uploadedByThisRequest = false;
        uploadedObject = null;
        throw new VisitRequestError("verification_unavailable", 503);
      }
      if (recovered) {
        const { data: balanceRow, error: balanceError } = await service
          .from("gempoint_balances")
          .select("balance")
          .eq("user_id", userId)
          .maybeSingle();
        if (balanceError) {
          // The verification already owns this object. Preserve it and let a
          // retry return the authoritative balance from the idempotent RPC.
          uploadedByThisRequest = false;
          uploadedObject = null;
          throw new VisitRequestError("verification_unavailable", 503);
        }
        const recoveredResult: VisitRpcResult = {
          verification_id: recovered.verification_id,
          verification_status: "verified",
          awarded_now: 0,
          balance: Number(balanceRow?.balance ?? 0),
          accepted_gemdrop: recovered.accepted_gemdrop,
          points_awarded: recovered.points_awarded,
          verified_at: recovered.created_at,
        };
        return json({ verification: recoveredResult });
      }

      // Distinguish a mutated reuse of the UUID from a genuinely uncommitted
      // RPC. A conflicting committed row owns this path and must retain it.
      const { data: conflicting, error: conflictLookupError } = await service
        .from("visit_verification_evidence")
        .select("verification_id")
        .eq("user_id", userId)
        .eq("client_request_id", clientRequestId)
        .maybeSingle();
      if (conflictLookupError) {
        uploadedByThisRequest = false;
        uploadedObject = null;
        throw new VisitRequestError("verification_unavailable", 503);
      }
      if (conflicting) {
        uploadedByThisRequest = false;
        uploadedObject = null;
        throw new VisitRequestError("idempotency_conflict", 409);
      }
      // The database definitively has no owner for this request path. Arm
      // compensation even when upload() found bytes from an earlier retry.
      uploadedByThisRequest = true;
      throw mapServiceError(error);
    }
    const verification = (Array.isArray(data) ? data[0] : data) as
      | VisitRpcResult
      | undefined;
    if (
      !verification?.verification_id ||
      verification.verification_status !== "verified"
    ) {
      throw new VisitRequestError("verification_unavailable", 503);
    }
    if (verification.verification_id !== clientRequestId) {
      // The database suppressed a second UUID for an already-verified trip
      // stop. The new path is not referenced by that authoritative record.
      // Keep compensation armed even when this request found an identical
      // orphan from an earlier ambiguous retry instead of uploading it.
      uploadedByThisRequest = true;
      const { error: cleanupError } = await service.storage
        .from(VISIT_EVIDENCE_BUCKET)
        .remove([objectPath]);
      if (cleanupError) {
        throw new VisitRequestError("verification_cleanup_failed", 503);
      }
      uploadedByThisRequest = false;
      uploadedObject = null;
    }
    return json({ verification });
  } catch (error) {
    if (uploadedByThisRequest && uploadedObject && service) {
      await service.storage.from(VISIT_EVIDENCE_BUCKET).remove([uploadedObject]);
    }
    if (error instanceof VisitRequestError) {
      return json({ error: error.code }, error.status);
    }
    return json({ error: "verification_unavailable" }, 503);
  }
}
