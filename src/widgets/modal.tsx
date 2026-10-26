import type { BoxRenderable, MouseEvent, Renderable } from "@opentui/core";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSectui, type ModalApi, type ModalOptions } from "../context.ts";
import { containsFocus } from "../focus/focus.ts";
import { useCommands } from "../keymap/commands.ts";

interface ModalEntry {
  id: number;
  render: (close: () => void) => ReactNode;
  options: ModalOptions;
  /** Focus to give back on close. */
  previous: Renderable | null;
  /** Set by close(), which can run before the frame's mount effect (a key repeated fast). */
  closed?: boolean;
}

/**
 * The window level for popups. Returns the API and the element to render on top
 * of the app. Modals are siblings of the main window, so its layers go inactive
 * while a modal has the focus.
 */
export function useModalHost(renderer: { currentFocusedRenderable: Renderable | null }): { api: ModalApi; host: ReactNode } {
  const [stack, setStack] = useState<ModalEntry[]>([]);
  const nextId = useRef(1);

  const close = useCallback((entry: ModalEntry) => {
    entry.closed = true;
    setStack((s) => s.filter((e) => e !== entry));
    const previous = entry.previous;
    if (previous && !previous.isDestroyed) previous.focus();
  }, []);

  const api = useMemo<ModalApi>(
    () => ({
      open(render, options = {}) {
        const entry: ModalEntry = { id: nextId.current++, render, options, previous: renderer.currentFocusedRenderable };
        setStack((s) => [...s, entry]);
        return () => close(entry);
      },
    }),
    [renderer, close],
  );

  const host = stack.map((entry, i) => <ModalFrame key={entry.id} entry={entry} depth={i} close={() => close(entry)} />);
  return { api, host };
}

/** Opacity of the dimming layer behind a popup, as a hex byte (aa ≈ 67%). */
const DIM_ALPHA = "aa";

function ModalFrame({ entry, depth, close }: { entry: ModalEntry; depth: number; close(): void }) {
  const { config, theme, renderer } = useSectui();
  const ref = useRef<BoxRenderable>(null);

  useCommands([{ name: "app.close", title: "Close", hint: true, run: close }], { target: ref });

  // Children focus what they need in their own effects (they run first); otherwise focus the frame.
  // Not once closed: the frame would take the focus back from `previous`, then lose it when destroyed.
  // On unmount, if the focus was lost anyway (a child grabbed it), give it back to `previous`.
  useEffect(() => {
    if (!entry.closed && !containsFocus(ref.current, renderer.currentFocusedRenderable)) ref.current?.focus();
    return () => {
      const { previous } = entry;
      if (!renderer.currentFocusedRenderable && previous && !previous.isDestroyed) previous.focus();
    };
  }, []);

  // A click outside the popup closes it, and reaches nothing behind it (no focus change).
  const outside = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    close();
  };

  return (
    <box
      position="absolute"
      left={0}
      top={0}
      width="100%"
      height="100%"
      zIndex={100 + depth}
      // Semi-transparent: what is behind stays visible, dimmed (colors blend, characters stay).
      backgroundColor={`${theme.bg}${DIM_ALPHA}`}
      style={{ alignItems: "center", justifyContent: "center" }}
      onMouseDown={outside}
    >
      <box
        ref={ref}
        focusable
        border
        borderStyle={config.borderStyle}
        borderColor={theme.borderFocused}
        backgroundColor={theme.bg}
        title={entry.options.title ? ` ${entry.options.title} ` : undefined}
        width={entry.options.width ?? "60%"}
        height={entry.options.height ?? "60%"}
        // The layer above is the whole screen: a fixed size shrinks with a smaller terminal, live.
        maxWidth="100%"
        maxHeight="100%"
        // Children never draw over the border when the frame is smaller than its content.
        style={{ flexDirection: "column", overflow: "hidden" }}
        onMouseDown={(e: MouseEvent) => {
          e.stopPropagation();
          // A click that closed the popup (a button): no focus on the click's target after it, the
          // frame is going away and the focus is already back where it was.
          if (entry.closed) e.preventDefault();
        }}
      >
        {entry.render(close)}
      </box>
    </box>
  );
}
