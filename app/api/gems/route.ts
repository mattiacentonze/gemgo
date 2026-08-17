import { createHash } from "node:crypto";

import sharp from "sharp";

import { createClient } from "../../../lib/supabase/server";
import { regionCodes } from "../../domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Vercel Functions reject request bodies above 4.5 MB before application code
// runs. Keep enough headroom for multipart boundaries and the text fields.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_MULTIPART_BYTES = MAX_UPLOAD_BYTES + 256 * 1024;
const MAX_INPUT_PIXELS = 40_000_000;
const MAX_NORMALIZED_EDGE = 2560;
const MIN_LANDSCAPE_RATIO = 1.22;
const CONTRIBUTION_BUCKET = "gem-contributions";
const TERMS_VERSION = "2026-08-13";
const MIN_FORM_AGE_MS = 2_000;
const MAX_FORM_AGE_MS = 4 * 60 * 60 * 1_000;

const contributionCategories = [
  "nature",
  "culture",
  "viewpoint",
  "activity",
  "local_place",
] as const;

type ContributionStatus = "pending" | "approved" | "rejected" | "withdrawn";

type RpcSubmission = {
  id: string;
  status: ContributionStatus;
  object_path: string;
};

class ContributionRequestError extends Error {
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

const cleanText = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim()
    : "";
};

const finiteFormNumber = (form: FormData, key: string) => {
  const raw = cleanText(form, key);
  if (raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
};

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

const authenticatedUserId = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
) => {
  const { data, error } = await supabase.auth.getClaims();
  const subject = data?.claims?.sub;
  const anonymous = (data?.claims as Record<string, unknown> | undefined)
    ?.is_anonymous;

  if (error || typeof subject !== "string" || anonymous === true) {
    throw new ContributionRequestError("authentication_required", 401);
  }

  return subject;
};

const normalizePhoto = async (photo: File) => {
  if (
    photo.size <= 0 ||
    photo.size > MAX_UPLOAD_BYTES ||
    !["image/jpeg", "image/png", "image/webp"].includes(photo.type)
  ) {
    throw new ContributionRequestError(
      photo.size > MAX_UPLOAD_BYTES ? "image_too_large" : "invalid_file_type",
      photo.size > MAX_UPLOAD_BYTES ? 413 : 400,
    );
  }

  const input = Buffer.from(await photo.arrayBuffer());
  if (input.byteLength <= 0 || input.byteLength > MAX_UPLOAD_BYTES) {
    throw new ContributionRequestError(
      input.byteLength > MAX_UPLOAD_BYTES ? "image_too_large" : "invalid_image",
      input.byteLength > MAX_UPLOAD_BYTES ? 413 : 400,
    );
  }

  try {
    const image = sharp(input, {
      failOn: "error",
      limitInputPixels: MAX_INPUT_PIXELS,
      animated: false,
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
      throw new ContributionRequestError("invalid_file_type", 400);
    }

    // rotate() applies EXIF orientation. Re-encoding without withMetadata()
    // deliberately removes EXIF, GPS and other source metadata.
    const normalized = await image
      .rotate()
      .resize({
        width: MAX_NORMALIZED_EDGE,
        height: MAX_NORMALIZED_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 84, effort: 5, smartSubsample: true })
      .toBuffer({ resolveWithObject: true });

    const { width, height, size } = normalized.info;
    if (!width || !height || width < 320 || height < 200) {
      throw new ContributionRequestError("image_too_small", 400);
    }
    if (width / height < MIN_LANDSCAPE_RATIO) {
      throw new ContributionRequestError("image_must_be_landscape", 400);
    }
    if (size <= 0 || size > MAX_UPLOAD_BYTES) {
      throw new ContributionRequestError("image_too_large", 413);
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
    // PostgreSQL bigint is signed; preserve all 64 dHash bits using two's
    // complement so bit_count(hash_a # hash_b) remains meaningful.
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
    if (error instanceof ContributionRequestError) throw error;
    throw new ContributionRequestError("invalid_image", 400);
  }
};

const mapSupabaseError = (error: {
  code?: string;
  message?: string;
  details?: string;
}) => {
  const evidence = `${error.code ?? ""} ${error.message ?? ""} ${error.details ?? ""}`;
  if (/authentication_required|jwt|not authenticated/i.test(evidence)) {
    return new ContributionRequestError("authentication_required", 401);
  }
  if (/verified_account_required/i.test(evidence)) {
    return new ContributionRequestError("verified_account_required", 403);
  }
  if (/rate_limit_exceeded/i.test(evidence)) {
    return new ContributionRequestError("rate_limit_exceeded", 429);
  }
  if (/reward_farming_limit/i.test(evidence)) {
    return new ContributionRequestError("reward_farming_limit", 429);
  }
  if (/location_outside_region/i.test(evidence)) {
    return new ContributionRequestError("location_outside_region", 400);
  }
  if (/duplicate_media/i.test(evidence)) {
    return new ContributionRequestError("duplicate_media", 409);
  }
  if (/23505|duplicate|unique/i.test(evidence)) {
    return new ContributionRequestError("duplicate_contribution", 409);
  }
  if (/22023|invalid_contribution/i.test(evidence)) {
    return new ContributionRequestError("invalid_contribution", 400);
  }
  return new ContributionRequestError("contribution_unavailable", 503);
};

const isExistingStorageObject = (error: {
  statusCode?: string | number;
  message?: string;
}) =>
  Number(error.statusCode) === 409 ||
  /already exists|duplicate/i.test(error.message ?? "");

export async function GET() {
  try {
    const supabase = await createClient();
    const userId = await authenticatedUserId(supabase);
    const { data, error } = await supabase
      .from("gem_suggestions")
      .select("id,name,status,created_at,reviewed_at")
      .eq("author_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw mapSupabaseError(error);
    return json({ suggestions: data ?? [] });
  } catch (error) {
    if (error instanceof ContributionRequestError) {
      return json({ error: error.code }, error.status);
    }
    return json({ error: "contribution_unavailable" }, 503);
  }
}

export async function POST(request: Request) {
  try {
    const requestOrigin = new URL(request.url).origin;
    const suppliedOrigin = request.headers.get("origin");
    const fetchSite = request.headers.get("sec-fetch-site");
    if (
      (suppliedOrigin && suppliedOrigin !== requestOrigin) ||
      fetchSite === "cross-site"
    ) {
      throw new ContributionRequestError("cross_site_request", 403);
    }
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_MULTIPART_BYTES) {
      throw new ContributionRequestError("image_too_large", 413);
    }
    if (!request.headers.get("content-type")?.includes("multipart/form-data")) {
      throw new ContributionRequestError("multipart_required", 415);
    }

    const supabase = await createClient();
    await authenticatedUserId(supabase);

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new ContributionRequestError("invalid_contribution", 400);
    }

    const name = cleanText(form, "name");
    const description = cleanText(form, "description");
    const region = cleanText(form, "region");
    const category = cleanText(form, "category");
    const rawMapUrl = cleanText(form, "mapUrl");
    const termsAccepted = cleanText(form, "termsAccepted");
    const honeypot = cleanText(form, "website");
    const formStartedAt = finiteFormNumber(form, "formStartedAt");
    const locationLatitude = finiteFormNumber(form, "locationLatitude");
    const locationLongitude = finiteFormNumber(form, "locationLongitude");
    const locationAccuracy = finiteFormNumber(form, "locationAccuracy");
    const locationCapturedAt = cleanText(form, "locationCapturedAt");
    const suppliedRequestId = cleanText(form, "clientRequestId");
    const clientRequestId = suppliedRequestId || crypto.randomUUID();
    const photo = form.get("photo");

    const formAge = formStartedAt === null ? Number.NaN : Date.now() - formStartedAt;
    if (
      name.length < 3 ||
      name.length > 90 ||
      description.length < 20 ||
      description.length > 500 ||
      !regionCodes.includes(region as (typeof regionCodes)[number]) ||
      region === "all" ||
      !contributionCategories.includes(
        category as (typeof contributionCategories)[number],
      ) ||
      (suppliedRequestId !== "" && !isUuid(suppliedRequestId))
    ) {
      throw new ContributionRequestError("invalid_contribution", 400);
    }
    if (
      honeypot !== "" ||
      !Number.isFinite(formAge) ||
      formAge < MIN_FORM_AGE_MS ||
      formAge > MAX_FORM_AGE_MS
    ) {
      throw new ContributionRequestError("invalid_contribution", 400);
    }
    if (
      locationLatitude === null ||
      locationLongitude === null ||
      locationAccuracy === null ||
      locationCapturedAt === "" ||
      !Number.isFinite(Date.parse(locationCapturedAt))
    ) {
      throw new ContributionRequestError("location_required", 400);
    }
    if (!photo || !(photo instanceof File)) {
      throw new ContributionRequestError("invalid_file_type", 400);
    }
    if (termsAccepted !== "true") {
      throw new ContributionRequestError("terms_required", 400);
    }

    let mapUrl = "";
    if (rawMapUrl) {
      try {
        const parsed = new URL(rawMapUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
        mapUrl = parsed.toString();
      } catch {
        throw new ContributionRequestError("invalid_map_url", 400);
      }
    }

    const normalized = await normalizePhoto(photo);
    const { data, error: submissionError } = await supabase.rpc(
      "submit_gem_suggestion",
      {
        p_id: clientRequestId,
        p_name: name,
        p_description: description,
        p_region: region,
        p_category: category,
        p_map_url: mapUrl,
        p_photo_sha256: normalized.sha256,
        p_photo_perceptual_hash: normalized.perceptualHash,
        p_photo_size: normalized.size,
        p_photo_width: normalized.width,
        p_photo_height: normalized.height,
        p_location_latitude: locationLatitude,
        p_location_longitude: locationLongitude,
        p_location_accuracy_m: locationAccuracy,
        p_location_captured_at: locationCapturedAt,
        p_terms_version: TERMS_VERSION,
        p_consent_confirmed: true,
      },
    );

    if (submissionError) throw mapSupabaseError(submissionError);
    const submission = (Array.isArray(data) ? data[0] : data) as
      | RpcSubmission
      | null;
    if (
      !submission?.id ||
      !submission.object_path ||
      submission.status !== "pending"
    ) {
      throw new ContributionRequestError("contribution_unavailable", 503);
    }

    const { error: uploadError } = await supabase.storage
      .from(CONTRIBUTION_BUCKET)
      .upload(submission.object_path, normalized.bytes, {
        contentType: "image/webp",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError && !isExistingStorageObject(uploadError)) {
      // Storage and Postgres are separate transactions. Best-effort object
      // removal plus an audited withdrawal prevents a database row from
      // remaining eligible for moderation without its required media. The
      // withdrawal must happen first because Storage deletion is RLS-limited
      // to withdrawn contributions.
      await supabase.rpc("withdraw_gem_suggestion", {
        p_id: submission.id,
      });
      await supabase.storage
        .from(CONTRIBUTION_BUCKET)
        .remove([submission.object_path]);
      throw new ContributionRequestError("contribution_upload_failed", 503);
    }

    return json(
      {
        suggestion: {
          id: submission.id,
          name,
          status: "pending",
        },
      },
      201,
    );
  } catch (error) {
    if (error instanceof ContributionRequestError) {
      return json({ error: error.code }, error.status);
    }
    return json({ error: "contribution_unavailable" }, 503);
  }
}
