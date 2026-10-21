import { TextAttributes } from "@opentui/core";
import { useSectuiConfig } from "../context.ts";

/** Which sides of the pill are rounded. */
export type BadgeRound = "both" | "left" | "right";

/** Nerd Font half circles (powerline extra symbols). */
const LEFT_CAP = "";
const RIGHT_CAP = "";

export interface BadgeProps {
  label: string;
  /** Text color. */
  fg: string;
  /** Fill color of the pill. */
  bg: string;
  /** Rounded ends: both (default), only the left one, or only the right one. */
  round?: BadgeRound;
  /** Background behind the rounded ends (the surface the badge sits on). Transparent when omitted. */
  surface?: string;
  /** Label in bold. */
  bold?: boolean;
}

/**
 * Width in cells: the label, one cell of padding per side, and one cell per end,
 * rounded or not. The same with or without Nerd Fonts or `roundedBadges`, so
 * layouts do not depend on those settings.
 */
export const badgeWidth = (label: string) => [...label].length + 4;

/**
 * A "pill": the label padded by a space on each side on a filled background,
 * with rounded ends drawn with Nerd Font half circles. A side that is not
 * rounded ends with a space on the fill instead. Without Nerd Fonts
 * (`nerdFonts: false`) or with `roundedBadges: false`, both ends are spaces on
 * the fill.
 */
export function Badge({ label, fg, bg, round = "both", surface, bold }: BadgeProps) {
  const { nerdFonts, roundedBadges } = useSectuiConfig();
  const rounded = nerdFonts && roundedBadges;
  const left = rounded && round !== "right";
  const right = rounded && round !== "left";
  return (
    <box style={{ flexDirection: "row", height: 1, flexShrink: 0 }}>
      {left ? (
        <text fg={bg} bg={surface} selectable={false}>
          {LEFT_CAP}
        </text>
      ) : null}
      <text fg={fg} bg={bg} attributes={bold ? TextAttributes.BOLD : undefined} selectable={false}>
        {`${left ? " " : "  "}${label}${right ? " " : "  "}`}
      </text>
      {right ? (
        <text fg={bg} bg={surface} selectable={false}>
          {RIGHT_CAP}
        </text>
      ) : null}
    </box>
  );
}
