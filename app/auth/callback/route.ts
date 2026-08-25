import { NextResponse, type NextRequest } from "next/server";

import {
  createRecoveryMarker,
  RECOVERY_MARKER_COOKIE,
  recoveryMarkerCookieOptions,
} from "@/app/auth/recovery-marker";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_RETURN_PATH = "/app";
const AUTH_ERROR_PATH = "/app/profile?auth_error=oauth_callback";
const PASSWORD_UPDATE_PATH = "/auth/update-password";

function clearRecoveryMarker(response: NextResponse) {
  response.cookies.set(RECOVERY_MARKER_COOKIE, "", {
    ...recoveryMarkerCookieOptions,
    expires: new Date(0),
    maxAge: 0,
  });
  return response;
}

function invalidRecoveryRedirect(requestUrl: URL) {
  const destination = new URL(PASSWORD_UPDATE_PATH, requestUrl.origin);
  destination.searchParams.set("error", "invalid_or_expired");
  return clearRecoveryMarker(NextResponse.redirect(destination));
}

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

  const isPasswordRecovery = destination.pathname === PASSWORD_UPDATE_PATH;

  if (!code) {
    if (isPasswordRecovery) {
      return invalidRecoveryRedirect(requestUrl);
    }
    return clearRecoveryMarker(
      NextResponse.redirect(new URL(AUTH_ERROR_PATH, requestUrl.origin)),
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(
    code,
    flowId ? { flowId } : undefined,
  );

  if (error) {
    if (isPasswordRecovery) {
      return invalidRecoveryRedirect(requestUrl);
    }
    return clearRecoveryMarker(
      NextResponse.redirect(new URL(AUTH_ERROR_PATH, requestUrl.origin)),
    );
  }

  // auth-js returns the PKCE verifier's redirect type at runtime. The
  // SupabaseClient facade currently omits that field from this method's type.
  const redirectType =
    "redirectType" in data && typeof data.redirectType === "string"
      ? data.redirectType
      : null;

  if (redirectType === "recovery") {
    if (!data.user) return invalidRecoveryRedirect(requestUrl);

    try {
      const response = NextResponse.redirect(
        new URL(PASSWORD_UPDATE_PATH, requestUrl.origin),
      );
      response.cookies.set(
        RECOVERY_MARKER_COOKIE,
        createRecoveryMarker(data.user.id),
        recoveryMarkerCookieOptions,
      );
      return response;
    } catch {
      await supabase.auth.signOut({ scope: "local" });
      return invalidRecoveryRedirect(requestUrl);
    }
  }

  // The requested return path is untrusted. A normal OAuth or magic-link
  // session must never be promoted into a password-recovery session by
  // choosing the update-password path.
  if (isPasswordRecovery) return invalidRecoveryRedirect(requestUrl);

  return clearRecoveryMarker(NextResponse.redirect(destination));
}
