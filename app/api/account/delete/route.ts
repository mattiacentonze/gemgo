import { NextRequest, NextResponse } from "next/server";

import { createClient } from "../../../../lib/supabase/server";

export const dynamic = "force-dynamic";

const sameOrigin = (request: NextRequest) => {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === request.nextUrl.origin);
};

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json(
      { error: "invalid_origin" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_request" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (
    !body ||
    typeof body !== "object" ||
    (body as { confirmation?: unknown }).confirmation !== "DELETE"
  ) {
    return NextResponse.json(
      { error: "confirmation_required" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json(
      { error: "authentication_required" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { data, error } = await supabase.rpc("request_account_deletion");
  if (error) {
    const code = error.message.includes("owner_transfer_required")
      ? "owner_transfer_required"
      : "deletion_request_failed";
    return NextResponse.json(
      { error: code },
      { status: code === "owner_transfer_required" ? 409 : 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const result = Array.isArray(data) ? data[0] : data;
  const paths = result && typeof result === "object" && Array.isArray(result.storage_paths)
    ? (result.storage_paths as unknown[]).filter((path: unknown): path is string => typeof path === "string")
    : [];
  let storageCleanupPending = paths.length > 0;
  if (paths.length > 0) {
    const removal = await supabase.storage.from("gem-contributions").remove(paths);
    storageCleanupPending = Boolean(removal.error);
  }

  // Global sign-out revokes refresh tokens on every device. Existing access
  // JWTs can remain valid until expiry, so the database migration separately
  // blocks writes as soon as the deletion request is queued.
  await supabase.auth.signOut({ scope: "global" });

  return NextResponse.json(
    {
      status: "pending",
      requestId: result && typeof result === "object" ? result.request_id : null,
      storageCleanupPending,
    },
    { status: 202, headers: { "Cache-Control": "no-store" } },
  );
}
