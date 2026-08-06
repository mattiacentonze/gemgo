const preferredFiles: Record<string, string[]> = {
  "Valpelline river villages": [
    "File:Valpelline 001.JPG",
    "File:Aosta - Buthier de Valpelline.jpg",
    "File:Panor cc oyace.jpg",
  ],
  "Weißensee lakeside loop": [
    "File:Weißensee (Füssen).jpg",
    "File:Weißensee1.JPG",
    "File:Weissensee (Fuessen) 2013-07-22.JPG",
  ],
  "Hall old-town culture walk": [
    "File:Stadtplatz Hall in Tirol.jpg",
    "File:Hall in Tirol 1993 - Old Town Street.jpg",
    "File:AUT Hall in Tirol, Schmiedgasse 003.jpg",
  ],
  "Mostnica gorge and Stara Fužina": [
    "File:Mostnica Gorge.jpg",
    "File:Mostnica Gorge 3.jpg",
    "File:Stara Fužina - Mostnica.jpg",
  ],
  "Lower Engadin village rail day": [
    "File:Engadinerhaus und hölzener Brunnen in Guarda.jpg",
    "File:Sent Engadin.jpg",
    "File:Unterengadin Ardez.jpg",
  ],
  "Vercors winter village circuit": [
    "File:Gresse en Vercors - Hiver.jpg",
    "File:Gresse en Vercors enneigé.jpg",
    "File:Place de l'Ours de Villard-de-Lans (France) en hiver.jpg",
  ],
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
