const preferredFiles: Record<string, string[]> = {
  Torgnon: ["File:Torgnon.JPG"],
  "Châtillon": ["File:Châtillon vista dal castello di Ussel..JPG"],
  "Gressoney-Saint-Jean": ["File:Gressoney-St-Jean - été.JPG"],
  "Colle del Piccolo San Bernardo": ["File:Piccolo S Bernardo.jpg"],
  "Fenis Castle": ["File:Fénis Castle.jpg"],
};

const searchAliases: Record<string, string> = {
  "Valpelline river villages": "Valpelline Valle d'Aosta river village",
  "Weißensee lakeside loop": "Weissensee Füssen lake Allgäu",
  "Hall old-town culture walk": "Hall in Tirol old town Austria",
  "Mostnica gorge and Stara Fužina": "Mostnica Gorge Stara Fuzina Bohinj",
  "Lower Engadin village rail day": "Lower Engadin Guarda Ardez village",
  "Vercors winter village circuit": "Vercors village winter France",
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
    iiprop: "url|extmetadata",
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
