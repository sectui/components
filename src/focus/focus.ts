import { CliRenderEvents, type Renderable } from "@opentui/core";
import { useEffect, useRef, useState, type RefObject } from "react";
import { useSectui } from "../context.ts";

/** Is `node` the focused renderable or one of its ancestors? */
export function containsFocus(node: Renderable | null | undefined, focused: Renderable | null): boolean {
  for (let n: Renderable | null = focused; n; n = n.parent as Renderable | null) if (n === node) return true;
  return false;
}

/**
 * Calls `listener` on every renderer focus change (keyboard or mouse).
 * Subscribed once, calling the latest `listener`: re-subscribing on every render
 * would miss a focus change made by a child's effect in the same commit (React
 * runs the child's effect before the parent subscribes again).
 */
export function useFocusChange(listener: (focused: Renderable | null) => void) {
  const { renderer } = useSectui();
  const latest = useRef(listener);
  latest.current = listener;
  useEffect(() => {
    const handler = () => latest.current(renderer.currentFocusedRenderable);
    renderer.on(CliRenderEvents.FOCUSED_RENDERABLE, handler);
    return () => {
      renderer.off(CliRenderEvents.FOCUSED_RENDERABLE, handler);
    };
  }, [renderer]);
}

/** True while the focus is inside `ref` (to highlight a pane border, for example). */
export function useFocusWithin(ref: RefObject<Renderable | null>): boolean {
  const { renderer } = useSectui();
  const [within, setWithin] = useState(false);
  useFocusChange((focused) => setWithin(containsFocus(ref.current, focused)));
  useEffect(() => setWithin(containsFocus(ref.current, renderer.currentFocusedRenderable)), [renderer]);
  return within;
}
