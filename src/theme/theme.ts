import type { Base24Key, SectuiConfig } from "../config/index.ts";

export interface Theme {
  /** The raw base24 palette, for anything the roles do not cover. */
  base: Readonly<Record<Base24Key, string>>;
  bg: string;
  bgAlt: string;
  selection: string;
  muted: string;
  fg: string;
  fgStrong: string;
  error: string;
  warning: string;
  success: string;
  info: string;
  accent: string;
  border: string;
  borderFocused: string;
}

/** Semantic roles, following the base16/base24 styling guidelines. */
export function createTheme(colors: SectuiConfig["colors"]): Theme {
  return Object.freeze({
    base: colors,
    bg: colors.base00,
    bgAlt: colors.base01,
    selection: colors.base02,
    muted: colors.base03,
    fg: colors.base05,
    fgStrong: colors.base06,
    error: colors.base08,
    warning: colors.base0A,
    success: colors.base0B,
    info: colors.base0C,
    accent: colors.base0D,
    border: colors.base03,
    borderFocused: colors.base0D,
  });
}
