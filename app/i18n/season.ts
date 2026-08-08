import type { Locale } from "../domain";
import type { Season } from "../product/types";

const labels: Record<Locale, Record<Season, string>> = {
  en: { spring: "Spring", summer: "Summer", autumn: "Autumn", winter: "Winter" },
  it: { spring: "Primavera", summer: "Estate", autumn: "Autunno", winter: "Inverno" },
  de: { spring: "Frühling", summer: "Sommer", autumn: "Herbst", winter: "Winter" },
  fr: { spring: "Printemps", summer: "Été", autumn: "Automne", winter: "Hiver" },
  sl: { spring: "Pomlad", summer: "Poletje", autumn: "Jesen", winter: "Zima" },
};

export const seasonUi: Record<Locale, { label: string; source: string }> = {
  en: { label: "Suitable seasons", source: "Editorial source" },
  it: { label: "Stagioni adatte", source: "Fonte editoriale" },
  de: { label: "Geeignete Jahreszeiten", source: "Redaktionelle Quelle" },
  fr: { label: "Saisons adaptées", source: "Source éditoriale" },
  sl: { label: "Primerne sezone", source: "Uredniški vir" },
};

export const seasonLabel = (locale: Locale, season: Season) => labels[locale][season];
