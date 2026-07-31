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

export function parsePrompt(
  input: string,
  options?: { now?: Date },
): PromptParseResult;
export function isValidParseResult(result: unknown): boolean;
export function normalizePrompt(input: string): string;
