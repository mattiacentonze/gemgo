import type { NextRequest } from "next/server";

import { type Locale, locales } from "../../domain";
import { createPublicClient } from "../../../lib/supabase/public";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestedLocale = request.nextUrl.searchParams.get("locale");
  const locale: Locale = locales.includes(requestedLocale as Locale)
    ? (requestedLocale as Locale)
    : "en";
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("destination_content")
    .select("destination_id,locale,name,summary,operational_note,opening_hours,price_information,seasonality,source_url,source_label")
    .eq("locale", locale)
    .eq("status", "published")
    .order("destination_id");

  if (error) {
    return Response.json(
      { content: [] },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
  return Response.json(
    { content: data ?? [] },
    { headers: { "cache-control": "public, max-age=60, s-maxage=300" } },
  );
}
