import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

import {
  isValidRecoveryMarker,
  RECOVERY_MARKER_COOKIE,
  recoveryMarkerCookieOptions,
} from "@/app/auth/recovery-marker";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const responseHeaders = {
  "Cache-Control": "no-store, private",
  Vary: "Cookie",
  "X-Content-Type-Options": "nosniff",
} as const;

function isSameOrigin(request: NextRequest) {
  return request.headers.get("origin") === request.nextUrl.origin;
}

function clearRecoveryMarker(response: NextResponse) {
  response.cookies.set(RECOVERY_MARKER_COOKIE, "", {
    ...recoveryMarkerCookieOptions,
    expires: new Date(0),
    maxAge: 0,
  });
  return response;
}

function invalidRecoveryResponse(status = 403) {
  return clearRecoveryMarker(
    NextResponse.json(
      { ready: false, error: "invalid_or_expired" },
      { status, headers: responseHeaders },
    ),
  );
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return invalidRecoveryResponse(403);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return invalidRecoveryResponse(401);
  }

  const marker = (await cookies()).get(RECOVERY_MARKER_COOKIE)?.value;
  try {
    if (!isValidRecoveryMarker(marker, data.user.id)) {
      return invalidRecoveryResponse();
    }
  } catch {
    return invalidRecoveryResponse(503);
  }

  return NextResponse.json(
    { ready: true },
    { status: 200, headers: responseHeaders },
  );
}

export async function DELETE(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return invalidRecoveryResponse(403);
  }

  return clearRecoveryMarker(
    NextResponse.json(
      { ready: false },
      { status: 200, headers: responseHeaders },
    ),
  );
}
