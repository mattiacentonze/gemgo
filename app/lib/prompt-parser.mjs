const locales = ["en", "it", "de", "fr", "sl"];
const transports = [
  "walking",
  "cycling",
  "e_bike",
  "driving",
  "public_transport",
];
const interests = ["lakes", "quiet", "culture", "views", "nature"];
const difficulties = ["easy", "moderate"];
const regions = ["all", "fussen_allgau", "bavaria", "aosta"];

const normalize = (value) =>
  value
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[’']/g, "")
    .replace(/[-_/]/g, " ")
    .replace(/[^\p{L}\p{N}\s.]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const numberWords = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  uno: 1,
  un: 1,
  due: 2,
  tre: 3,
  quattro: 4,
  cinque: 5,
  sei: 6,
  sette: 7,
  ein: 1,
  eine: 1,
  einen: 1,
  zwei: 2,
  drei: 3,
  vier: 4,
  funf: 5,
  sechs: 6,
  sieben: 7,
  un: 1,
  une: 1,
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
  six: 6,
  sept: 7,
  en: 1,
  ena: 1,
  eno: 1,
  dva: 2,
  dve: 2,
  tri: 3,
  stiri: 4,
  pet: 5,
  sest: 6,
  sedem: 7,
};

const durationUnits = [
  "day",
  "days",
  "giorno",
  "giorni",
  "tag",
  "tage",
  "jour",
  "jours",
  "dan",
  "dni",
];

const lexicon = {
  transport: {
    walking: [
      "walk",
      "walking",
      "hike",
      "hiking",
      "a piedi",
      "camminando",
      "passeggiata",
      "zu fuss",
      "wandern",
      "a pied",
      "marche",
      "peš",
      "pes",
      "hoja",
    ],
    cycling: [
      "bike",
      "bicycle",
      "cycling",
      "bici",
      "bicicletta",
      "fahrrad",
      "rad",
      "velo",
      "vélo",
      "kolo",
      "kolesom",
    ],
    e_bike: [
      "e bike",
      "ebike",
      "bici elettrica",
      "bicicletta elettrica",
      "elektrofahrrad",
      "elektrisches fahrrad",
      "velo electrique",
      "vélo électrique",
      "elektricno kolo",
      "električno kolo",
    ],
    driving: [
      "car",
      "driving",
      "automobile",
      "auto",
      "macchina",
      "wagen",
      "voiture",
      "avto",
      "avtom",
      "avta",
    ],
    public_transport: [
      "public transport",
      "transit",
      "bus",
      "train",
      "trasporto pubblico",
      "mezzi pubblici",
      "treno",
      "zug",
      "offentliche verkehrsmittel",
      "transport public",
      "transports en commun",
      "javnim prevozom",
      "javni prevoz",
      "vlak",
    ],
  },
  interest: {
    lakes: [
      "lake",
      "lakes",
      "swim",
      "lago",
      "laghi",
      "nuotare",
      "see",
      "seen",
      "lac",
      "lacs",
      "jezero",
      "jezera",
    ],
    quiet: [
      "quiet",
      "peaceful",
      "hidden",
      "calm",
      "tranquillo",
      "tranquilli",
      "pace",
      "nascosto",
      "ruhig",
      "friedlich",
      "calme",
      "tranquille",
      "miren",
      "mirno",
      "tih",
    ],
    culture: [
      "culture",
      "museum",
      "museums",
      "castle",
      "village",
      "cultura",
      "museo",
      "musei",
      "castello",
      "borghi",
      "kultur",
      "museum",
      "museen",
      "schloss",
      "culture",
      "musee",
      "musée",
      "musees",
      "musées",
      "chateau",
      "château",
      "kultura",
      "muzej",
      "muzejev",
      "grad",
    ],
    views: [
      "view",
      "views",
      "panorama",
      "panoramic",
      "vista",
      "viste",
      "aussicht",
      "panoramique",
      "vue",
      "razgled",
      "panoramski",
    ],
    nature: [
      "nature",
      "forest",
      "wildlife",
      "natura",
      "foresta",
      "natur",
      "wald",
      "nature",
      "foret",
      "forêt",
      "narava",
      "gozd",
    ],
  },
  difficulty: {
    easy: [
      "easy",
      "gentle",
      "facile",
      "semplice",
      "leicht",
      "einfach",
      "facile",
      "enostavno",
      "lahko",
    ],
    moderate: [
      "moderate",
      "challenging",
      "medio",
      "moderato",
      "mittelschwer",
      "modere",
      "modéré",
      "srednje",
      "zahtevno",
    ],
  },
};

const regionLexicon = {
  aosta: [
    "aosta",
    "valle d aosta",
    "vallee d aoste",
    "vallée d aoste",
    "aostatal",
    "dolina aoste",
    "cervinia",
    "courmayeur",
  ],
  fussen_allgau: ["fussen", "füssen", "allgau", "allgäu"],
  bavaria: ["bavaria", "bayern", "baviere", "bavière", "baviera", "bavarska"],
};

const negationPrefixes = [
  "no",
  "not",
  "without",
  "avoid",
  "dont want",
  "do not want",
  "non",
  "senza",
  "niente",
  "non voglio",
  "kein",
  "keine",
  "keinen",
  "ohne",
  "nicht",
  "pas de",
  "sans",
  "ne veux pas",
  "ne souhaite pas",
  "brez",
  "ne zelim",
  "ne želim",
  "noben",
  "nobene",
];

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const hasPhrase = (text, phrase) => {
  const normalizedPhrase = normalize(phrase);
  return new RegExp(`(?:^|\\s)${escapeRegex(normalizedPhrase)}(?:$|\\s)`, "u").test(
    text,
  );
};

const phraseIsNegated = (text, phrase) => {
  const normalizedPhrase = normalize(phrase);
  return negationPrefixes.some((prefix) => {
    const normalizedPrefix = normalize(prefix);
    return new RegExp(
      `(?:^|\\s)${escapeRegex(normalizedPrefix)}(?:\\s+\\p{L}+){0,2}\\s+${escapeRegex(
        normalizedPhrase,
      )}(?:$|\\s)`,
      "u",
    ).test(text);
  });
};

const levenshtein = (a, b) => {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const old = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        previous + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      previous = old;
    }
  }
  return row[b.length];
};

const fuzzyHasSingleWord = (tokens, phrase) => {
  const candidate = normalize(phrase);
  if (candidate.includes(" ") || candidate.length < 5) return false;
  return tokens.some(
    (token) =>
      token.length >= 5 &&
      Math.abs(token.length - candidate.length) <= 1 &&
      levenshtein(token, candidate) <= 1,
  );
};

const matchLexicon = (text, entries) => {
  const tokens = text.split(" ");
  const positive = [];
  const negative = [];
  Object.entries(entries).forEach(([code, phrases]) => {
    const matches = phrases.filter(
      (phrase) => hasPhrase(text, phrase) || fuzzyHasSingleWord(tokens, phrase),
    );
    if (matches.length === 0) return;
    const negated = matches.some((phrase) => phraseIsNegated(text, phrase));
    if (negated) {
      negative.push(code);
    }
    if (!negated && matches.some((phrase) => !phraseIsNegated(text, phrase))) {
      positive.push(code);
    }
  });
  return { positive, negative };
};

const localDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (date, count) => {
  const next = new Date(date);
  next.setDate(next.getDate() + count);
  return localDate(next);
};

const weekdayNames = {
  1: ["monday", "lunedi", "lunedi", "montag", "lundi", "ponedeljek"],
  2: ["tuesday", "martedi", "dienstag", "mardi", "torek"],
  3: ["wednesday", "mercoledi", "mittwoch", "mercredi", "sreda"],
  4: ["thursday", "giovedi", "donnerstag", "jeudi", "cetrtek"],
  5: ["friday", "venerdi", "freitag", "vendredi", "petek"],
  6: ["saturday", "sabato", "samstag", "samedi", "sobota"],
  0: ["sunday", "domenica", "sonntag", "dimanche", "nedelja"],
};

const parseStartDate = (text, now, rawText) => {
  const iso = rawText.match(
    /\b(20\d{2})-(0[1-9]|1[0-2])-([0-2]\d|3[01])\b/,
  );
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const local = rawText.match(
    /\b([0-2]?\d|3[01])[/.](0?\d|1[0-2])[/.](20\d{2})\b/,
  );
  if (local) {
    return `${local[3]}-${String(Number(local[2])).padStart(2, "0")}-${String(
      Number(local[1]),
    ).padStart(2, "0")}`;
  }
  const relatives = [
    { terms: ["day after tomorrow", "dopodomani", "ubermorgen", "apres demain", "pojutrisnjem"], offset: 2 },
    { terms: ["tomorrow", "domani", "morgen", "demain", "jutri"], offset: 1 },
    { terms: ["today", "oggi", "heute", "aujourd hui", "danes"], offset: 0 },
  ];
  const relative = relatives.find((item) =>
    item.terms.some((term) => hasPhrase(text, term)),
  );
  if (relative) return addDays(now, relative.offset);

  for (const [weekday, names] of Object.entries(weekdayNames)) {
    if (!names.some((name) => hasPhrase(text, name))) continue;
    const target = Number(weekday);
    const delta = ((target - now.getDay() + 7) % 7) || 7;
    return addDays(now, delta);
  }
  return undefined;
};

const parseDays = (text) => {
  const unitPattern = durationUnits.map(escapeRegex).join("|");
  const digit = text.match(
    new RegExp(
      `\\b([1-7])(?:\\s+\\p{L}+){0,2}\\s+(?:${unitPattern})\\b`,
      "u",
    ),
  );
  if (digit) return Number(digit[1]);
  for (const [word, number] of Object.entries(numberWords)) {
    if (
      new RegExp(
        `\\b${escapeRegex(word)}(?:\\s+\\p{L}+){0,2}\\s+(?:${unitPattern})\\b`,
        "u",
      ).test(text)
    ) {
      return number;
    }
  }
  const hours = text.match(
    /\b(\d{1,3})\s*(?:hours?|ore|stunden?|heures?|ur)\b/u,
  );
  if (hours) return Math.max(1, Math.min(7, Math.ceil(Number(hours[1]) / 24)));
  return undefined;
};

export function parsePrompt(input, options = {}) {
  const rawText = String(input ?? "").toLocaleLowerCase();
  const text = normalize(rawText);
  const now = options.now instanceof Date ? options.now : new Date();
  const transportMatches = matchLexicon(text, lexicon.transport);
  const interestMatches = matchLexicon(text, lexicon.interest);
  const difficultyMatches = matchLexicon(text, lexicon.difficulty);
  const region = Object.entries(regionLexicon).find(([, phrases]) =>
    phrases.some((phrase) => hasPhrase(text, phrase)),
  )?.[0];

  const crowdTerms = [
    "crowd",
    "crowds",
    "crowded",
    "affollato",
    "affollamento",
    "menschenmengen",
    "uberfullt",
    "foule",
    "bondé",
    "gneca",
    "mnozica",
  ];
  const crowdMention = crowdTerms.find((term) => hasPhrase(text, term));
  let avoidCrowds;
  if (crowdMention) avoidCrowds = phraseIsNegated(text, crowdMention);
  if (interestMatches.positive.includes("quiet")) avoidCrowds = true;
  if (interestMatches.negative.includes("quiet")) avoidCrowds = false;

  const result = {
    days: parseDays(text),
    startDate: parseStartDate(text, now, rawText),
    region,
    transport: transportMatches.positive.at(-1),
    excludedTransports: transportMatches.negative,
    interests: interestMatches.positive,
    excludedInterests: interestMatches.negative,
    difficulty: difficultyMatches.positive.at(-1),
    avoidCrowds,
    confidence: 0,
    ambiguous: [],
  };

  const recognized = [
    result.days,
    result.startDate,
    result.region,
    result.transport,
    result.interests.length > 0,
    result.difficulty,
    result.avoidCrowds !== undefined,
  ].filter(Boolean).length;
  result.confidence = text ? Math.min(1, 0.24 + recognized * 0.13) : 0;
  if (transportMatches.positive.length > 1) result.ambiguous.push("transport");
  if (difficultyMatches.positive.length > 1) result.ambiguous.push("difficulty");
  return result;
}

export function isValidParseResult(result) {
  return Boolean(
    result &&
      (result.days === undefined ||
        (Number.isInteger(result.days) && result.days >= 1 && result.days <= 7)) &&
      (result.transport === undefined || transports.includes(result.transport)) &&
      (result.region === undefined || regions.includes(result.region)) &&
      (result.difficulty === undefined ||
        difficulties.includes(result.difficulty)) &&
      Array.isArray(result.interests) &&
      result.interests.every((value) => interests.includes(value)) &&
      Array.isArray(result.excludedInterests) &&
      result.excludedInterests.every((value) => interests.includes(value)) &&
      Array.isArray(result.excludedTransports) &&
      result.excludedTransports.every((value) => transports.includes(value)) &&
      locales.every((value) => typeof value === "string"),
  );
}

export { normalize as normalizePrompt };
