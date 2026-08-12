import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

const DEFAULT_RETURN_PATH = "/app";
const AUTH_ERROR_PATH = "/app/profile?auth_error=oauth_callback";

function safeReturnUrl(request: NextRequest, requestedPath: string | null) {
  const requestUrl = new URL(request.url);

  if (!requestedPath?.startsWith("/") || requestedPath.startsWith("//")) {
    return new URL(DEFAULT_RETURN_PATH, requestUrl.origin);
  }

  try {
    const candidate = new URL(requestedPath, requestUrl.origin);

    if (candidate.origin !== requestUrl.origin) {
      return new URL(DEFAULT_RETURN_PATH, requestUrl.origin);
    }

    return candidate;
  } catch {
    return new URL(DEFAULT_RETURN_PATH, requestUrl.origin);
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const flowId = requestUrl.searchParams.get("sb_flow_id");
  const destination = safeReturnUrl(
    request,
    requestUrl.searchParams.get("next"),
  );

  if (!code) {
    return NextResponse.redirect(new URL(AUTH_ERROR_PATH, requestUrl.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(
    code,
    flowId ? { flowId } : undefined,
  );

  if (error) {
    return NextResponse.redirect(new URL(AUTH_ERROR_PATH, requestUrl.origin));
  }

  return NextResponse.redirect(destination);
}
