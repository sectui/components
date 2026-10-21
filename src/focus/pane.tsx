import type { BoxRenderable, Renderable } from "@opentui/core";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useSectui } from "../context.ts";
import { useCommands, type CommandDef } from "../keymap/commands.ts";
import { containsFocus, useFocusChange, useFocusWithin } from "./focus.ts";
import { useTabView } from "./tabs.tsx";

export interface PaneProps {
  /** Unique within its tab; used to remember the focused pane. */
  id: string;
  title?: string;
  /** Extra label on the bottom border, right-aligned (e.g. a count or progress). */
  bottomRight?: string;
  /** Focus this child instead of the pane itself (a list, an editor…). */
  focusTarget?: RefObject<Renderable | null>;
  /** Layout passthrough: width, height, flexGrow… */
  style?: Record<string, unknown>;
  children?: ReactNode;
}

const PaneContext = createContext<RefObject<BoxRenderable | null> | null>(null);

/** Commands active while the focus is inside the enclosing <Pane>. */
export function usePaneCommands(defs: CommandDef[]) {
  const ref = useContext(PaneContext);
  if (!ref) throw new Error("usePaneCommands: must be used inside a <Pane>");
  useCommands(defs, { target: ref });
}

/**
 * The pane level of the focus model: a focusable bordered box. Its content
 * registers pane commands with `usePaneCommands()`.
 */
export function Pane({ id, title, bottomRight, focusTarget, style, children }: PaneProps) {
  const { config, theme, renderer } = useSectui();
  const tab = useTabView();
  const ref = useRef<BoxRenderable>(null);
  const focused = useFocusWithin(ref);
  const [editing, setEditing] = useState(false);

  useEffect(
    () =>
      tab?.register({
        id,
        ref,
        focus: () => (focusTarget?.current ?? ref.current)?.focus(),
      }),
    [tab, id],
  );

  // escape in a text field gives the focus back to the pane.
  useFocusChange(() => setEditing(!!renderer.currentFocusedEditor && containsFocus(ref.current, renderer.currentFocusedEditor)));
  useCommands([{ name: "app.close", title: "Leave field", hint: true, enabled: editing, run: () => ref.current?.focus() }], {
    target: ref,
    priority: 10,
  });

  return (
    <box
      ref={ref}
      id={`pane:${id}`}
      focusable
      border
      borderStyle={config.borderStyle}
      borderColor={focused ? theme.borderFocused : theme.border}
      title={title ? ` ${title} ` : undefined}
      bottomTitle={bottomRight ? ` ${bottomRight} ` : undefined}
      bottomTitleAlignment="right"
      // Children never draw over the border: a focused textarea paints its whole content otherwise.
      style={{ flexDirection: "column", overflow: "hidden", ...style }}
    >
      <PaneContext.Provider value={ref}>{children}</PaneContext.Provider>
    </box>
  );
}
