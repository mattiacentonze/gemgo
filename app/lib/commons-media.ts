const preferredFiles: Record<string, string> = {
  Torgnon: "File:Torgnon.JPG",
  "Châtillon": "File:Châtillon vista dal castello di Ussel..JPG",
  "Gressoney-Saint-Jean": "File:Gressoney-St-Jean - été.JPG",
  "Colle del Piccolo San Bernardo": "File:Piccolo S Bernardo.jpg",
  "Fenis Castle": "File:Fénis Castle.jpg",
};

export const preferredCommonsTitle = (name: string) => preferredFiles[name];

export const commonsImageParams = (
  name: string,
  region: string,
  width: number,
  limit = 8,
) => {
  const preferred = preferredCommonsTitle(name);
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: String(width),
  });
  if (preferred) {
    params.set("titles", preferred);
  } else {
    params.set("generator", "search");
    params.set("gsrnamespace", "6");
    params.set("gsrlimit", String(limit));
    params.set("gsrsearch", `${name} ${region}`);
  }
  return params;
};
