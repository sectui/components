import * as v from "valibot";

export const BASE24_KEYS = [
  "base00",
  "base01",
  "base02",
  "base03",
  "base04",
  "base05",
  "base06",
  "base07",
  "base08",
  "base09",
  "base0A",
  "base0B",
  "base0C",
  "base0D",
  "base0E",
  "base0F",
  "base10",
  "base11",
  "base12",
  "base13",
  "base14",
  "base15",
  "base16",
  "base17",
] as const;
export type Base24Key = (typeof BASE24_KEYS)[number];

const HexColor = v.pipe(v.string(), v.regex(/^#[0-9a-fA-F]{6}$/, "expected a color like #1e1e2e"));
const KeyList = v.union([v.string(), v.array(v.string())], "expected a key or a list of keys");

/**
 * Entries shared by every sectui tool. A tool spreads them into its own schema:
 *
 *   const Schema = v.strictObject({ ...sectuiEntries, proxy: v.strictObject({ … }) })
 */
export const sectuiEntries = {
  borderStyle: v.picklist(["single", "double", "rounded", "heavy"]),
  nerdFonts: v.boolean(),
  emoji: v.boolean(),
  roundedBadges: v.boolean(),
  spacious: v.boolean(),
  helpBar: v.boolean(),
  transparentBackground: v.boolean(),
  colors: v.strictObject(Object.fromEntries(BASE24_KEYS.map((k) => [k, HexColor])) as Record<Base24Key, typeof HexColor>),
  keys: v.record(v.string(), KeyList),
};

export const SectuiConfigSchema = v.strictObject(sectuiEntries);
export type SectuiConfig = v.InferOutput<typeof SectuiConfigSchema>;
export type Keys = SectuiConfig["keys"];
