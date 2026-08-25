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

  const [accountResult, visitEvidenceResult] = await Promise.all([
    supabase.rpc("export_my_account_data"),
    supabase
      .from("visit_verification_evidence")
      .select(
        "verification_id,trip_id,experience_id,photo_sha256,photo_perceptual_hash,byte_size,width,height,location_accuracy_m,distance_m,location_captured_at,accepted_gemdrop,points_awarded,validation_version,created_at",
      )
      .eq("user_id", authData.user.id)
      .order("created_at", { ascending: false }),
  ]);
  if (accountResult.error || !accountResult.data || visitEvidenceResult.error) {
    return NextResponse.json(
      { error: "export_failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const accountData =
    typeof accountResult.data === "object" &&
    accountResult.data !== null &&
    !Array.isArray(accountResult.data)
      ? accountResult.data
      : { account: accountResult.data };
  const data = {
    ...accountData,
    visitVerificationEvidence: visitEvidenceResult.data ?? [],
  };

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
