import { TextAttributes } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/react";
import { useTheme } from "../context.ts";
import { Badge, badgeWidth } from "./badge.tsx";
import { fitTabs } from "./fit-tabs.ts";

export interface TabBarProps {
  titles: string[];
  active: number;
  onSelect(index: number): void;
  /** Left of the bar, e.g. "Spilltea: client-x". */
  title?: string;
  /** Right of the bar, e.g. "127.0.0.1:8080"; `compact` (":8080") is used when the tabs need the room. */
  right?: { full: string; compact?: string };
}

const ELLIPSIS = " ... ";
const cells = (s: string) => [...s].length;
/** An inactive tab: as wide as the active tab's badge, the label at the same place. */
const label = (title: string) => `  ${title}  `;

/** Width of an optional badge: nothing when its text is empty. */
const badgeCells = (text: string) => (text ? badgeWidth(text) : 0);

/**
 * The navbar: tool title on the left, tabs in the middle, `right` on the right.
 * The title, the active tab and `right` are badges (pills, rounded with Nerd
 * Fonts). When the tabs do not fit, the active one is always shown, then its
 * neighbours; hidden tabs become "...". Titles are clickable, "..." opens the
 * nearest hidden tab.
 */
export function TabBar({ titles, active, onSelect, title, right }: TabBarProps) {
  const theme = useTheme();
  const { width } = useTerminalDimensions();
  const widths = titles.map((t) => cells(label(t)));
  const all = widths.reduce((a, b) => a + b, 0);

  // Who gives up room first when the bar is short: the tabs other than the active
  // one ("..."), then the right text (compact form), then the left title (cut, then
  // hidden). The active tab is always shown in full.
  const GAP = 2;
  const space = width; // the badges carry their own padding on the screen edges
  const tabsRoom = (left: string, rightText: string) =>
    space - badgeCells(left) - badgeCells(rightText) - (left ? GAP : 0) - (rightText ? GAP : 0);
  const markers = (active > 0 ? cells(ELLIPSIS) : 0) + (active < titles.length - 1 ? cells(ELLIPSIS) : 0);
  // The least the tabs need: the active one, plus "..." where others are hidden.
  const minimum = (widths[active] ?? 0) + (all > (widths[active] ?? 0) ? markers : 0);

  let rightText = right?.full ?? "";
  if (right?.compact !== undefined && tabsRoom(title ?? "", rightText) < all) rightText = right.compact;
  if (rightText && minimum + GAP + badgeCells(rightText) > space) rightText = "";
  // What is left for the title's text once the tabs' minimum and the right badge are placed.
  const titleRoom = space - minimum - badgeCells(rightText) - (rightText ? GAP : 0) - GAP - badgeWidth("");
  const leftText = !title || titleRoom < 4 ? "" : cells(title) <= titleRoom ? title : [...title].slice(0, titleRoom - 1).join("") + "…";
  const fit = fitTabs(widths, active, tabsRoom(leftText, rightText), cells(ELLIPSIS));

  const ellipsis = (index: number) => (
    <text
      fg={theme.muted}
      attributes={TextAttributes.BOLD}
      selectable={false}
      style={{ flexShrink: 0 }}
      onMouseDown={() => onSelect(index)}
    >
      {ELLIPSIS}
    </text>
  );

  return (
    <box style={{ flexDirection: "row", height: 1, flexShrink: 0, backgroundColor: theme.bgAlt }}>
      {leftText ? (
        <box style={{ flexShrink: 0, marginRight: GAP }}>
          <Badge label={leftText} fg={theme.bg} bg={theme.base.base0E} round="right" surface={theme.bgAlt} bold />
        </box>
      ) : null}
      <box style={{ flexDirection: "row", flexGrow: 1, flexShrink: 1, justifyContent: "center" }}>
        {fit.hiddenLeft ? ellipsis(fit.start - 1) : null}
        {titles.slice(fit.start, fit.end + 1).map((t, k) => {
          const i = fit.start + k;
          return i === active ? (
            <box key={t} style={{ flexShrink: 0 }} onMouseDown={() => onSelect(i)}>
              <Badge label={t} fg={theme.bg} bg={theme.accent} surface={theme.bgAlt} bold />
            </box>
          ) : (
            <text
              key={t}
              fg={theme.muted}
              attributes={TextAttributes.BOLD}
              selectable={false}
              style={{ flexShrink: 0 }}
              onMouseDown={() => onSelect(i)}
            >
              {label(t)}
            </text>
          );
        })}
        {fit.hiddenRight ? ellipsis(fit.end + 1) : null}
      </box>
      {rightText ? (
        <box style={{ flexShrink: 0, marginLeft: GAP }}>
          <Badge label={rightText} fg={theme.fgStrong} bg={theme.selection} round="left" surface={theme.bgAlt} bold />
        </box>
      ) : null}
    </box>
  );
}
