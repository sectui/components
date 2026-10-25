import type { Renderable } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/react";
import { useMemo, useState } from "react";
import { useSectui } from "../context.ts";
import { useCommands } from "../keymap/commands.ts";
import { bindingKeys } from "./binding-keys.ts";

interface Entry {
  name: string;
  title: string;
  keys: string;
}

/**
 * Lists the commands reachable from `previous` (the focus before the palette
 * opened) and runs the chosen one in that context.
 */
export function CommandPalette({
  previous,
  close,
  heightRatio = 0.5,
}: {
  previous: Renderable | null;
  close(): void;
  /** Height of the modal as a fraction of the terminal, to know how many rows fit. */
  heightRatio?: number;
}) {
  const { keymap, theme } = useSectui();
  const { height } = useTerminalDimensions();
  const rows = Math.max(1, Math.floor(height * heightRatio) - 4); // borders, input, margin
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);

  const entries = useMemo<Entry[]>(() => {
    const q = query.toLowerCase();
    return keymap
      .getCommandEntries({ visibility: "reachable", focused: previous })
      .map((e) => ({
        name: e.command.name,
        title: String((e.command as { title?: unknown }).title ?? ""),
        keys: bindingKeys(e.bindings).join("/"),
      }))
      .filter((e) => e.title && !e.name.startsWith("palette.") && e.name !== "app.palette")
      .filter((e) => !q || e.title.toLowerCase().includes(q) || e.name.includes(q));
  }, [keymap, previous, query]);

  const selected = Math.min(index, Math.max(0, entries.length - 1));
  const run = () => {
    const entry = entries[selected];
    close();
    if (entry) keymap.dispatchCommand(entry.name, { focused: previous ?? undefined });
  };

  // Functional updates: several keys can arrive before the next render.
  useCommands([
    { name: "palette.up", title: "Previous", run: () => setIndex((i) => Math.max(0, Math.min(i, entries.length - 1) - 1)) },
    { name: "palette.down", title: "Next", run: () => setIndex((i) => Math.min(entries.length - 1, i + 1)) },
  ]);
  // Show a window of rows that keeps the selection visible.
  const first = Math.max(0, Math.min(selected - rows + 1, entries.length - rows));
  const visible = entries.slice(first, first + rows);

  return (
    <box style={{ flexDirection: "column", flexGrow: 1 }}>
      <input
        focused
        placeholder="Type a command…"
        onInput={(value: string) => {
          setQuery(value);
          setIndex(0);
        }}
        onSubmit={run}
      />
      <box style={{ flexDirection: "column", flexGrow: 1, marginTop: 1, overflow: "hidden" }}>
        {entries.length === 0 ? <text fg={theme.muted}>No command available here.</text> : null}
        {visible.map((e, k) => {
          const i = first + k;
          return (
            <box
              key={e.name}
              style={{ flexDirection: "row", justifyContent: "space-between", height: 1, flexShrink: 0 }}
              backgroundColor={i === selected ? theme.selection : undefined}
            >
              <text fg={i === selected ? theme.fgStrong : theme.fg}>{e.title}</text>
              <text fg={theme.muted}>{`${e.name}  ${e.keys}`}</text>
            </box>
          );
        })}
      </box>
    </box>
  );
}
