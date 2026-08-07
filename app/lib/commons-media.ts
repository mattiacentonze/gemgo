const preferredFiles: Record<string, string[]> = {
  Torgnon: ["File:Torgnon.JPG"],
  "Châtillon": ["File:Châtillon vista dal castello di Ussel..JPG"],
  "Gressoney-Saint-Jean": ["File:Gressoney-St-Jean - été.JPG"],
  "Colle del Piccolo San Bernardo": ["File:Piccolo S Bernardo.jpg"],
  "Fenis Castle": ["File:Fénis Castle.jpg"],
};

const searchAliases: Record<string, string> = {
  "Fenis Castle": "Fénis Castle Valle d'Aosta",
  "Colle del Piccolo San Bernardo": "Piccolo San Bernardo Valle d'Aosta",
};

export const preferredCommonsTitles = (name: string) => preferredFiles[name] ?? [];

export const commonsSearchText = (name: string, region: string) =>
  searchAliases[name] ?? `${name} ${region}`;

export const commonsImageParams = (
  name: string,
  region: string,
  width: number,
  limit = 16,
) => {
  const preferred = preferredCommonsTitles(name);
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    prop: "imageinfo",
    iiprop: "url|size|extmetadata",
    iiurlwidth: String(width),
  });
  if (preferred.length > 0) {
    params.set("titles", preferred.join("|"));
  } else {
    params.set("generator", "search");
    params.set("gsrnamespace", "6");
    params.set("gsrlimit", String(limit));
    params.set("gsrsearch", commonsSearchText(name, region));
  }
  return params;
};
