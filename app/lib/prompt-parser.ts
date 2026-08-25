import type {
  DifficultyCode,
  InterestCode,
  RegionCode,
  TransportCode,
} from "../domain";

export type PromptParseResult = {
  days?: number;
  startDate?: string;
  region?: Exclude<RegionCode, "all">;
  transport?: TransportCode;
  excludedTransports: TransportCode[];
  interests: InterestCode[];
  excludedInterests: InterestCode[];
  difficulty?: DifficultyCode;
  avoidCrowds?: boolean;
  confidence: number;
  ambiguous: string[];
};

const transports = [
  "walking",
  "cycling",
  "e_bike",
  "driving",
  "public_transport",
 ] as const satisfies readonly TransportCode[];
const interests = ["lakes", "quiet", "culture", "views", "nature"] as const satisfies readonly InterestCode[];
const difficulties = ["easy", "moderate"] as const satisfies readonly DifficultyCode[];
const regions = ["fussen_allgau", "bavaria", "aosta"] as const satisfies readonly Exclude<RegionCode, "all">[];

const normalize = (value: string) =>
  value
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[’']/g, " ")
    .replace(/[-_/]/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
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
  une: 1,
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
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
      "camminare",
      "passeggiata",
      "zu fuss",
      "wandern",
      "a pied",
      "marche",
      "marcher",
      "gehen",
      "peš",
      "pes",
      "hoja",
      "hojo",
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
      "e fahrrad",
      "elektrisches fahrrad",
      "electric bike",
      "e bicycle",
      "velo electrique",
      "vélo électrique",
      "elektricno kolo",
      "električno kolo",
      "elektricnim kolesom",
      "električnim kolesom",
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
      "avtomobil",
      "avtomobilom",
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
      "offentlichen verkehrsmitteln",
      "öffentlichen verkehrsmitteln",
      "transport public",
      "transports en commun",
      "transports publics",
      "javnim prevozom",
      "javni prevoz",
      "vlak",
      "vlakom",
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
      "schwierig",
      "modere",
      "modéré",
      "difficult",
      "hard",
      "difficile",
      "impegnativo",
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
  bavaria: ["bavaria", "bayern", "baviere", "bavière", "baviera", "bavarska", "bavarskem", "bavarski"],
};

const negationPrefixes = [
  "no",
  "not",
  "without",
  "avoid",
  "avoiding",
  "evitare",
  "evita",
  "vermeiden",
  "vermeide",
  "eviter",
  "éviter",
  "izogibaj se",
  "izogibati se",
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
  "pas",
  "sans",
  "ne veux pas",
  "ne souhaite pas",
  "brez",
  "ne",
  "ne zelim",
  "ne želim",
  "noben",
  "nobene",
];

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const hasPhrase = (text: string, phrase: string) => {
  const normalizedPhrase = normalize(phrase);
  return new RegExp(`(?:^|\\s)${escapeRegex(normalizedPhrase)}(?:$|\\s)`, "u").test(
    text,
  );
};

const levenshtein = (a: string, b: string) => {
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

type LexiconMatch<Code extends string> = {
  code: Code;
  start: number;
  end: number;
  phraseLength: number;
  fuzzy: boolean;
};

const normalizedNegations = negationPrefixes
  .map((prefix) => normalize(prefix).split(" ").filter(Boolean))
  .sort((first, second) => second.length - first.length);

const negationFillers = new Set([
  "a", "an", "the", "my", "any", "some", "to",
  "il", "lo", "la", "i", "gli", "le", "un", "uno", "una", "dei", "del", "della",
  "der", "die", "das", "den", "dem", "ein", "eine", "einen", "einem",
  "de", "des", "du", "les", "le", "la", "un", "une",
  "z", "za", "s", "velikim", "velike", "velikih",
]);

const crowdAvoidSuffixes = [
  "avoid",
  "avoiding",
  "evitare",
  "evita",
  "vermeiden",
  "vermeide",
  "eviter",
  "éviter",
  "izogibaj se",
  "izogibati se",
  "izogniti se",
].map((phrase) => normalize(phrase).split(" ").filter(Boolean));

const sameTokens = (first: string[], second: string[]) =>
  first.length === second.length && first.every((value, index) => value === second[index]);

const isNegatedBefore = (tokens: string[], start: number) =>
  normalizedNegations.some((prefix) => {
    for (let fillerCount = 0; fillerCount <= 2; fillerCount += 1) {
      const prefixStart = start - fillerCount - prefix.length;
      if (prefixStart < 0) continue;
      const fillers = tokens.slice(prefixStart + prefix.length, start);
      if (
        sameTokens(tokens.slice(prefixStart, prefixStart + prefix.length), prefix) &&
        fillers.every((filler) => negationFillers.has(filler))
      ) {
        return true;
      }
    }
    return false;
  });

const isCrowdAvoided = (tokens: string[], match: LexiconMatch<string>) =>
  isNegatedBefore(tokens, match.start) || crowdAvoidSuffixes.some((suffix) =>
    sameTokens(tokens.slice(match.end, match.end + suffix.length), suffix),
  );

const findPhraseMatches = <Code extends string>(
  tokens: string[],
  code: Code,
  phrase: string,
): LexiconMatch<Code>[] => {
  const phraseTokens = normalize(phrase).split(" ").filter(Boolean);
  if (phraseTokens.length === 0) return [];
  const matches: LexiconMatch<Code>[] = [];
  for (let start = 0; start <= tokens.length - phraseTokens.length; start += 1) {
    if (sameTokens(tokens.slice(start, start + phraseTokens.length), phraseTokens)) {
      matches.push({ code, start, end: start + phraseTokens.length, phraseLength: phraseTokens.length, fuzzy: false });
    }
  }
  if (phraseTokens.length !== 1 || phraseTokens[0].length < 5) return matches;
  for (let start = 0; start < tokens.length; start += 1) {
    const token = tokens[start];
    if (
      token.length >= 5 &&
      Math.abs(token.length - phraseTokens[0].length) <= 1 &&
      levenshtein(token, phraseTokens[0]) <= 1
    ) {
      matches.push({ code, start, end: start + 1, phraseLength: 1, fuzzy: true });
    }
  }
  return matches;
};

const preferSpecificMatches = <Code extends string>(matches: LexiconMatch<Code>[]) =>
  matches.filter((match) => !matches.some((other) =>
    other.code !== match.code &&
    other.phraseLength > match.phraseLength &&
    other.start <= match.start &&
    other.end >= match.end,
  ));

const matchLexicon = <Code extends string>(
  tokens: string[],
  entries: Record<Code, readonly string[]>,
) => {
  const matches = preferSpecificMatches(
    (Object.entries(entries) as [Code, readonly string[]][]).flatMap(([code, phrases]) =>
      phrases.flatMap((phrase) => findPhraseMatches(tokens, code, phrase)),
    ),
  );
  const positiveEntries: Array<{ code: Code; lastStart: number }> = [];
  const negative: Code[] = [];
  (Object.entries(entries) as [Code, readonly string[]][]).forEach(([code]) => {
    const codeMatches = matches.filter((match) => match.code === code);
    if (codeMatches.length === 0) return;
    if (codeMatches.some((match) => isNegatedBefore(tokens, match.start))) {
      negative.push(code);
    }
    if (!codeMatches.some((match) => isNegatedBefore(tokens, match.start))) {
      positiveEntries.push({
        code,
        lastStart: Math.max(...codeMatches.map((match) => match.start)),
      });
    }
  });
  return {
    positive: positiveEntries
      .sort((first, second) => first.lastStart - second.lastStart)
      .map(({ code }) => code),
    negative,
  };
};

const localDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (date: Date, count: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + count);
  return localDate(next);
};

const weekdayNames: Record<number, string[]> = {
  1: ["monday", "lunedi", "lunedi", "montag", "lundi", "ponedeljek"],
  2: ["tuesday", "martedi", "dienstag", "mardi", "torek"],
  3: ["wednesday", "mercoledi", "mittwoch", "mercredi", "sreda", "sredo"],
  4: ["thursday", "giovedi", "donnerstag", "jeudi", "cetrtek"],
  5: ["friday", "venerdi", "freitag", "vendredi", "petek"],
  6: ["saturday", "sabato", "samstag", "samedi", "sobota", "soboto"],
  0: ["sunday", "domenica", "sonntag", "dimanche", "nedelja", "nedeljo"],
};

const validCalendarDate = (year: number, month: number, day: number) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

const formattedDate = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const parseStartDate = (text: string, now: Date, rawText: string) => {
  const iso = rawText.match(
    /\b(20\d{2})-(0[1-9]|1[0-2])-([0-2]\d|3[01])\b/,
  );
  if (iso) {
    const [year, month, day] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
    if (validCalendarDate(year, month, day)) return formattedDate(year, month, day);
  }
  const local = rawText.match(
    /\b([0-2]?\d|3[01])[/.](0?\d|1[0-2])[/.](20\d{2})\b/,
  );
  if (local) {
    const [year, month, day] = [Number(local[3]), Number(local[2]), Number(local[1])];
    if (validCalendarDate(year, month, day)) return formattedDate(year, month, day);
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

const parseDays = (text: string) => {
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

export function parsePrompt(
  input: string,
  options: { now?: Date } = {},
): PromptParseResult {
  const rawText = String(input ?? "").toLocaleLowerCase();
  const text = normalize(rawText);
  const tokens = text ? text.split(" ") : [];
  const now = options.now instanceof Date ? options.now : new Date();
  const transportMatches = matchLexicon(tokens, lexicon.transport);
  const interestMatches = matchLexicon(tokens, lexicon.interest);
  const difficultyMatches = matchLexicon(tokens, lexicon.difficulty);
  const regionMatches = matchLexicon(tokens, regionLexicon);

  const crowdTerms = [
    "crowd",
    "crowds",
    "crowded",
    "congestion",
    "affollato",
    "affollamento",
    "folla",
    "folle",
    "affluenza",
    "andrang",
    "menschenmenge",
    "menschenmengen",
    "uberfullt",
    "überfüllt",
    "foule",
    "foules",
    "affluence",
    "bondé",
    "bondee",
    "gneca",
    "gneče",
    "mnozica",
    "množica",
  ];
  const crowdMatches = preferSpecificMatches(
    crowdTerms.flatMap((term) => findPhraseMatches(tokens, "crowd", term)),
  );
  let avoidCrowds: boolean | undefined;
  if (crowdMatches.length > 0) {
    avoidCrowds = crowdMatches.some((match) => isCrowdAvoided(tokens, match));
  }
  if (interestMatches.positive.includes("quiet")) avoidCrowds = true;
  if (interestMatches.negative.includes("quiet")) avoidCrowds = false;

  const result: PromptParseResult = {
    days: parseDays(text),
    startDate: parseStartDate(text, now, rawText),
    region: regionMatches.positive.at(-1),
    transport: transportMatches.positive.at(-1),
    excludedTransports: transportMatches.negative,
    interests: interestMatches.positive,
    excludedInterests: interestMatches.negative,
    difficulty: difficultyMatches.positive.at(-1) ??
      (difficultyMatches.negative.includes("moderate")
        ? "easy"
        : difficultyMatches.negative.includes("easy")
          ? "moderate"
          : undefined),
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
  if (regionMatches.positive.length > 1) result.ambiguous.push("region");
  return result;
}

export function isValidParseResult(result: unknown) {
  if (!result || typeof result !== "object") return false;
  const candidate = result as Partial<PromptParseResult>;
  return Boolean(
      (candidate.days === undefined ||
        (Number.isInteger(candidate.days) && candidate.days >= 1 && candidate.days <= 7)) &&
      (candidate.transport === undefined || transports.includes(candidate.transport)) &&
      (candidate.startDate === undefined ||
        /^20\d{2}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(candidate.startDate) &&
          validCalendarDate(
            Number(candidate.startDate.slice(0, 4)),
            Number(candidate.startDate.slice(5, 7)),
            Number(candidate.startDate.slice(8, 10)),
          )) &&
      (candidate.region === undefined || regions.includes(candidate.region)) &&
      (candidate.difficulty === undefined ||
        difficulties.includes(candidate.difficulty)) &&
      Array.isArray(candidate.interests) &&
      candidate.interests.every((value) =>
        (interests as readonly InterestCode[]).includes(value),
      ) &&
      Array.isArray(candidate.excludedInterests) &&
      candidate.excludedInterests.every((value) =>
        (interests as readonly InterestCode[]).includes(value),
      ) &&
      Array.isArray(candidate.excludedTransports) &&
      candidate.excludedTransports.every((value) => transports.includes(value)) &&
      (candidate.avoidCrowds === undefined || typeof candidate.avoidCrowds === "boolean") &&
      typeof candidate.confidence === "number" &&
      Number.isFinite(candidate.confidence) &&
      candidate.confidence >= 0 &&
      candidate.confidence <= 1 &&
      Array.isArray(candidate.ambiguous) &&
      candidate.ambiguous.every((value) => typeof value === "string"),
  );
}

export { normalize as normalizePrompt };
