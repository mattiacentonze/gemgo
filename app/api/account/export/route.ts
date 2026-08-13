import { NextResponse } from "next/server";

import { createClient } from "../../../../lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json(
      { error: "authentication_required" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { data, error } = await supabase.rpc("export_my_account_data");
  if (error || !data) {
    return NextResponse.json(
      { error: "export_failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Cache-Control": "no-store, private",
      "Content-Disposition": `attachment; filename="gemgo-account-${authData.user.id}.json"`,
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
