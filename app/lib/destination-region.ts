import type { Destination, RegionCode } from "../domain";
import { normalizePrompt } from "./prompt-parser.mjs";

export const inferDestinationRegion = (
  input: string,
  destinations: Destination[],
): Exclude<RegionCode, "all"> | undefined => {
  const normalizedInput = ` ${normalizePrompt(input)} `;
  return destinations
    .filter((destination) => normalizePrompt(destination.name).length >= 4)
    .sort(
      (a, b) =>
        normalizePrompt(b.name).length - normalizePrompt(a.name).length,
    )
    .find((destination) =>
      normalizedInput.includes(` ${normalizePrompt(destination.name)} `),
    )?.region;
};
