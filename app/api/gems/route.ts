import { getDb } from "../../../db";
import { gemSuggestions } from "../../../db/schema";
import { regionCodes } from "../../domain";

const contributionCategories = [
  "nature",
  "culture",
  "viewpoint",
  "activity",
  "local_place",
] as const;

const cleanText = (value: unknown, maxLength: number) =>
  typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, maxLength)
    : "";

const contributionKey = (name: string, region: string) =>
  `${region}:${name}`
    .toLocaleLowerCase("en")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const isUniqueViolation = (error: unknown) =>
  error instanceof Error && /unique|constraint/i.test(error.message);

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const name = cleanText(payload.name, 90);
    const description = cleanText(payload.description, 500);
    const region = cleanText(payload.region, 40);
    const category = cleanText(payload.category, 40);
    const rawMapUrl = cleanText(payload.mapUrl, 500);
    const mapUrl = rawMapUrl ? new URL(rawMapUrl) : null;
    const photoName = cleanText(payload.photoName, 180);
    const photoType = cleanText(payload.photoType, 80);
    const photoSize = Number(payload.photoSize);

    if (name.length < 3 || description.length < 20 || !photoName || !["image/jpeg", "image/png", "image/webp"].includes(photoType) || !Number.isFinite(photoSize) || photoSize <= 0 || photoSize > 8 * 1024 * 1024) {
      return Response.json({ error: "invalid_contribution" }, { status: 400 });
    }
    if (!regionCodes.includes(region as (typeof regionCodes)[number]) || region === "all") {
      return Response.json({ error: "invalid_region" }, { status: 400 });
    }
    if (!contributionCategories.includes(category as (typeof contributionCategories)[number])) {
      return Response.json({ error: "invalid_category" }, { status: 400 });
    }
    if (mapUrl && !["http:", "https:"].includes(mapUrl.protocol)) {
      return Response.json({ error: "invalid_map_url" }, { status: 400 });
    }

    const suggestion = {
      id: crypto.randomUUID(),
      name,
      description,
      region,
      category,
      mapUrl: mapUrl?.toString() ?? null,
      normalizedKey: contributionKey(name, region),
      status: "pending",
    };
    const db = await getDb();
    const [created] = await db
      .insert(gemSuggestions)
      .values(suggestion)
      .returning({ id: gemSuggestions.id, status: gemSuggestions.status });

    return Response.json({ suggestion: created, reward: 70 }, { status: 201 });
  } catch (error) {
    if (error instanceof TypeError) {
      return Response.json({ error: "invalid_map_url" }, { status: 400 });
    }
    if (isUniqueViolation(error)) {
      return Response.json({ error: "duplicate_contribution" }, { status: 409 });
    }
    return Response.json({ error: "contribution_unavailable" }, { status: 500 });
  }
}
