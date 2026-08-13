export type DestinationMediaAuditStatus =
  | "reviewed"
  | "metadata-only"
  | "no-approved-media";

export type DestinationMediaAudit = {
  status: DestinationMediaAuditStatus;
  reviewedAt: string;
  reviewer: "GemGo editorial";
  searchQuery: string;
  minimumLandscapeRatio: 1.22;
  relevance: "named-place" | "immediate-setting" | "pending-human-review";
  sourceUrl?: string;
  fileTitle?: string;
  author?: string;
  license?: string;
  width?: number;
  height?: number;
  note: string;
};

const reviewedAt = "2026-08-13";

const reviewedMedia: Record<
  string,
  Omit<DestinationMediaAudit, "reviewedAt" | "reviewer" | "minimumLandscapeRatio">
> = {
  bav_020: {
    status: "reviewed",
    searchQuery: "Falkenstein Ruin Pfronten Bavaria",
    relevance: "named-place",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Falkenstein-Pfronten-JR-E-5485-2021-07-02.jpg",
    fileTitle: "File:Falkenstein-Pfronten-JR-E-5485-2021-07-02.jpg",
    author: "Johannes Robalotoff",
    license: "CC BY-SA 3.0 DE",
    width: 4979,
    height: 3068,
    note: "Local WebP derivative shows Falkenstein ruin on its limestone ridge.",
  },
  vda_004: {
    status: "reviewed",
    searchQuery: "Fénis Castle Valle d'Aosta",
    relevance: "named-place",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:F%C3%A9nis_Castle.jpg",
    fileTitle: "File:Fénis Castle.jpg",
    author: "Einaz80",
    license: "CC BY-SA 4.0",
    width: 3264,
    height: 2448,
    note: "Landscape source shows Fénis Castle and its immediate grounds.",
  },
  vda_010: {
    status: "reviewed",
    searchQuery: "Torgnon Valle d'Aosta",
    relevance: "named-place",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Torgnon.JPG",
    fileTitle: "File:Torgnon.JPG",
    author: "Elena Tartaglione",
    license: "CC BY-SA 3.0",
    width: 2816,
    height: 2112,
    note: "Landscape source shows the settlement and mountain setting of Torgnon.",
  },
  vda_011: {
    status: "reviewed",
    searchQuery: "Gressoney-Saint-Jean Castel Savoia",
    relevance: "named-place",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:02E1680001-MIBAC_Castel_Savoia_a_Gressoney-Saint-Jean.jpg",
    fileTitle:
      "File:02E1680001-MIBAC Castel Savoia a Gressoney-Saint-Jean.jpg",
    author: "Mostacchi.angelo",
    license: "CC BY-SA 4.0",
    width: 4000,
    height: 3000,
    note: "Landscape source shows Castel Savoia in Gressoney-Saint-Jean.",
  },
  vda_023: {
    status: "reviewed",
    searchQuery: "Little Saint Bernard Pass Valle d'Aosta",
    relevance: "named-place",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Piccolo_S_Bernardo.jpg",
    fileTitle: "File:Piccolo S Bernardo.jpg",
    author: "Bbruno",
    license: "CC BY-SA 4.0",
    width: 4000,
    height: 3000,
    note: "Landscape source shows the pass terrain and infrastructure.",
  },
  vda_024: {
    status: "reviewed",
    searchQuery: "Châtillon Valle d'Aosta",
    relevance: "named-place",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Ch%C3%A2tillon_vista_dal_castello_di_Ussel..JPG",
    fileTitle: "File:Châtillon vista dal castello di Ussel..JPG",
    author: "Patafisik",
    license: "CC BY-SA 3.0",
    width: 2288,
    height: 1712,
    note: "Landscape source shows Châtillon and its valley setting from Ussel.",
  },
  "alpify-castle-neuschwanstein": {
    status: "reviewed",
    searchQuery: "Neuschwanstein Castle Bavaria",
    relevance: "named-place",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Aerial_image_of_Neuschwanstein_Castle_(view_from_the_northwest).jpg",
    fileTitle:
      "File:Aerial image of Neuschwanstein Castle (view from the northwest).jpg",
    author: "Carsten Steger",
    license: "CC BY-SA 4.0",
    width: 6284,
    height: 4713,
    note: "Local WebP derivative is persisted with source and licence attribution.",
  },
};

const catalogueIds = [
  ...Array.from({ length: 25 }, (_, index) => `bav_${String(index + 1).padStart(3, "0")}`),
  ...Array.from({ length: 25 }, (_, index) => `vda_${String(index + 1).padStart(3, "0")}`),
  "alpify-weisensee",
  "alpify-forgensee",
  "alpify-faulensee",
  "alpify-gaisalpsee",
  "alpify-buchenberg",
  "alpify-tegelberg",
  "alpify-castle-hohenschwangau",
  "alpify-breitachklamm",
  "alpify-castle-neuschwanstein",
  "alpify-nesselwang-waterfall-trail",
  "alpify-starzlachklamm",
  "alpify-gruenten",
  "alpify-castle-ruin-hapfen",
  "alpify-ruin-att-trauchburg",
  "alpify-eisenberg-hohenfreyberg",
  "alpify-buchenegger-waterfalls",
] as const;

const searchQueryFor = (id: string) =>
  `${id.replace(/^alpify-/, "").replaceAll("_", " ").replaceAll("-", " ")} ${id.startsWith("vda_") ? "Valle d'Aosta" : "Bavaria"}`;

export const destinationMediaAudit: Record<string, DestinationMediaAudit> =
  Object.fromEntries(
    catalogueIds.map((id) => {
      const reviewed = reviewedMedia[id];
      return [
        id,
        reviewed
          ? {
              ...reviewed,
              reviewedAt,
              reviewer: "GemGo editorial",
              minimumLandscapeRatio: 1.22,
            }
          : {
              status: "metadata-only",
              reviewedAt,
              reviewer: "GemGo editorial",
              searchQuery: searchQueryFor(id),
              minimumLandscapeRatio: 1.22,
              relevance: "pending-human-review",
              note:
                "No image is approved by this record. Runtime Commons results remain licence, landscape and filename filtered and require human visual review.",
            },
      ];
    }),
  );

export const reviewedDestinationMedia = Object.fromEntries(
  Object.entries(destinationMediaAudit).filter(
    ([, record]) => record.status === "reviewed",
  ),
);
