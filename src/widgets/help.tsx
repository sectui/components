import type { Renderable, ScrollBoxRenderable } from "@opentui/core";
import { useEffect, useRef } from "react";
import { useSectui } from "../context.ts";
import { useCommands } from "../keymap/commands.ts";

interface Row {
  name: string;
  title: string;
  keys: string;
}

const RANK: [RegExp, number][] = [
  [/^app\./, 1],
  [/^tab\./, 2],
  [/^pane\./, 3],
];
const rank = (name: string) => RANK.find(([re]) => re.test(name))?.[1] ?? 0;

/**
 * Every shortcut available where the focus was when the help opened (`previous`),
 * with all their keys. Commands without a key are left out: the palette lists them.
 * Scrolls with the mouse wheel and the scroll.* keys (j / k, arrows, page up / down).
 */
export function Help({ previous, onUnmount }: { previous: Renderable | null; onUnmount?(): void }) {
  const { keymap, theme } = useSectui();
  const scroll = useRef<ScrollBoxRenderable>(null);
  useEffect(() => onUnmount, []);

  const rows: Row[] = keymap
    .getCommandEntries({ visibility: "reachable", focused: previous })
    .filter((e) => e.bindings.length > 0 && typeof (e.command as { title?: unknown }).title === "string")
    .map((e) => ({
      name: e.command.name,
      title: (e.command as unknown as { title: string }).title,
      keys: e.bindings.map((b) => b.sequence.map((s) => s.display).join("")).join(", "),
    }))
    .sort((a, b) => rank(a.name) - rank(b.name));

  const page = () => Math.max(1, (scroll.current?.viewport.height ?? 10) - 1);
  useCommands([
    { name: "scroll.up", title: "Scroll up", run: () => scroll.current?.scrollBy(-1) },
    { name: "scroll.down", title: "Scroll down", run: () => scroll.current?.scrollBy(1) },
    { name: "scroll.page-up", title: "Page up", run: () => scroll.current?.scrollBy(-page()) },
    { name: "scroll.page-down", title: "Page down", run: () => scroll.current?.scrollBy(page()) },
  ]);

  const keysWidth = Math.min(24, Math.max(4, ...rows.map((r) => r.keys.length)));
  return (
    <scrollbox ref={scroll} style={{ flexGrow: 1 }}>
      {rows.map((r) => (
        <box key={r.name} style={{ flexDirection: "row", height: 1, flexShrink: 0, gap: 2, paddingRight: 1 }}>
          <text fg={theme.accent} style={{ flexShrink: 0 }}>
            {r.keys.padEnd(keysWidth)}
          </text>
          <text fg={theme.fg} style={{ flexGrow: 1 }}>
            {r.title}
          </text>
          <text fg={theme.muted} style={{ flexShrink: 0 }}>
            {r.name}
          </text>
        </box>
      ))}
    </scrollbox>
  );
}
