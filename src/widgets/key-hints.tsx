import { useActiveKeys } from "@opentui/keymap/react";
import { useTerminalDimensions } from "@opentui/react";
import { useSectuiConfig, useTheme } from "../context.ts";

export interface Hint {
  name: string;
  title: string;
  keys: string[];
  /** Asked to be in the short help (CommandDef.hint). */
  short: boolean;
}

/**
 * Order, most useful first: the tool's own commands (they depend on the focus),
 * then app-wide ones, then navigation that users learn quickly.
 */
const RANK: [RegExp, number][] = [
  [/^app\./, 1],
  [/^tab\./, 2],
  [/^pane\./, 3],
];
const rank = (name: string) => RANK.find(([re]) => re.test(name))?.[1] ?? 0;

/** The shortcuts usable right now (from the focus and the state), one entry per command. */
export function useHints(): Hint[] {
  const active = useActiveKeys({ includeMetadata: true });
  const byCommand = new Map<string, Hint>();
  for (const key of active) {
    const name = typeof key.command === "string" ? key.command : undefined;
    const title = key.commandAttrs?.title;
    if (!name || typeof title !== "string") continue;
    const hint = byCommand.get(name) ?? { name, title, keys: [], short: key.commandAttrs?.hint === true };
    hint.keys.push(key.display);
    byCommand.set(name, hint);
  }
  return [...byCommand.values()].sort((a, b) => rank(a.name) - rank(b.name)); // stable: keeps keymap order within a rank
}

const firstKey = (value: string | readonly string[] | undefined) => (typeof value === "string" ? value : value?.[0]);

const cells = (s: string) => [...s].length;
const GAP = 2;

/**
 * The bottom bar: the short help (commands with `hint: true`, first key each) and how to open the full help.
 * Only whole hints are shown: those that do not fit are left out, never cut in the middle.
 * `reserved`: cells the bar uses for something else (AppShell's `status`).
 */
export function KeyHints({ reserved = 0 }: { reserved?: number }) {
  const theme = useTheme();
  const config = useSectuiConfig();
  const { width } = useTerminalDimensions();
  const help = firstKey(config.keys["app.help"]);
  // The bar's padding (1 + 1), then the help key, which always stays.
  let room = width - 2 - reserved - (help ? cells(help) + 1 + cells("for help") + GAP : 0);
  const hints = useHints()
    .filter((h) => h.short)
    .filter((h, i) => {
      const need = (i > 0 ? GAP : 0) + cells(h.keys[0] ?? "") + 1 + cells(h.title);
      if (need > room) return ((room = -1), false); // keep the order: nothing after a hint that did not fit
      room -= need;
      return true;
    });
  return (
    <box style={{ flexDirection: "row", gap: 2, height: 1, flexGrow: 1 }}>
      <box style={{ flexDirection: "row", gap: 2, flexGrow: 1, flexShrink: 1, overflow: "hidden" }}>
        {hints.map((h) => (
          <box key={h.name} style={{ flexDirection: "row", gap: 1, flexShrink: 0 }}>
            <text fg={theme.accent} selectable={false}>
              {h.keys[0]}
            </text>
            <text fg={theme.muted} selectable={false}>
              {h.title}
            </text>
          </box>
        ))}
      </box>
      {help ? (
        <box style={{ flexDirection: "row", gap: 1, flexShrink: 0 }}>
          <text fg={theme.accent} selectable={false}>
            {help}
          </text>
          <text fg={theme.muted} selectable={false}>
            for help
          </text>
        </box>
      ) : null}
    </box>
  );
}
