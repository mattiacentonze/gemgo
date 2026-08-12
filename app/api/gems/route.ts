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
const TERMS_VERSION = "2026-08-12";

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

    return {
      bytes: normalized.data,
      width,
      height,
      size,
      sha256: createHash("sha256").update(normalized.data).digest("hex"),
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
    const suppliedRequestId = cleanText(form, "clientRequestId");
    const clientRequestId = suppliedRequestId || crypto.randomUUID();
    const photo = form.get("photo");

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
        p_photo_size: normalized.size,
        p_photo_width: normalized.width,
        p_photo_height: normalized.height,
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
