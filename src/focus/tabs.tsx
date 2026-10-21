import type { BoxRenderable, Renderable } from "@opentui/core";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useSectui } from "../context.ts";
import { useCommands } from "../keymap/commands.ts";
import { TabBar, type TabBarProps } from "../widgets/tab-bar.tsx";
import { containsFocus, useFocusChange } from "./focus.ts";
import { nearestInDirection, type Direction } from "./navigation.ts";

export interface TabDef {
  id: string;
  title: string;
  /** Shown before the title in the navbar (a Nerd Font icon); the palette uses the title alone. */
  icon?: string;
  content: ReactNode;
}

interface PaneEntry {
  id: string;
  ref: RefObject<BoxRenderable | null>;
  focus(): void;
}

interface TabViewContextValue {
  register(entry: PaneEntry): () => void;
}

const TabViewContext = createContext<TabViewContextValue | null>(null);
export const useTabView = () => useContext(TabViewContext);

export interface TabsApi {
  /** Id of the active tab. */
  active: string;
  /** Switch to a tab, optionally focusing one of its panes (by pane id). */
  select(tabId: string, paneId?: string): void;
}

const TabsContext = createContext<TabsApi | null>(null);

/** Switch tabs from code, e.g. a "send to …" command that opens another page. */
export function useTabs(): TabsApi {
  const api = useContext(TabsContext);
  if (!api) throw new Error("useTabs: must be used inside <Tabs>");
  return api;
}

/**
 * The tab level of the focus model. Inactive tabs are unmounted: state that must
 * survive a switch lives in the tool's stores. Each tab remembers its last
 * focused pane.
 */
export function Tabs({
  tabs,
  initial = 0,
  bar,
  navbar = true,
}: {
  tabs: TabDef[];
  initial?: number;
  bar?: Pick<TabBarProps, "title" | "right">;
  /** false: no navbar (a single-tab window, such as a startup screen). */
  navbar?: boolean;
}) {
  const { renderer, config } = useSectui();
  const ref = useRef<BoxRenderable>(null);
  const [active, setActive] = useState(initial);
  const memory = useRef(new Map<string, string>()); // tab id -> last focused pane id
  const go = (delta: number) => setActive((i) => (i + delta + tabs.length) % tabs.length);

  useCommands(
    [
      { name: "tab.next", title: "Next tab", run: () => go(1) },
      { name: "tab.previous", title: "Previous tab", run: () => go(-1) },
      // One per tab: tab.goto.<id>. Keys come from the tool's config (keys: tab.goto.history: "2").
      ...tabs.map((t, i) => ({ name: `tab.goto.${t.id}`, title: `Go to ${t.title}`, enabled: i !== active, run: () => setActive(i) })),
    ],
    { target: ref },
  );

  const tab = tabs[active]!;
  const api: TabsApi = {
    active: tab.id,
    select(tabId, paneId) {
      const index = tabs.findIndex((t) => t.id === tabId);
      if (index < 0) return;
      // The tab focuses its remembered pane when it mounts.
      if (paneId) memory.current.set(tabId, paneId);
      // Already active: it will not remount, focus the pane now (only the active tab is mounted).
      if (index === active && paneId) renderer.root.findDescendantById(`pane:${paneId}`)?.focus();
      setActive(index);
    },
  };
  return (
    <TabsContext.Provider value={api}>
      <box ref={ref} style={{ flexDirection: "column", flexGrow: 1 }}>
        {navbar ? (
          <TabBar titles={tabs.map((t) => (t.icon ? `${t.icon} ${t.title}` : t.title))} active={active} onSelect={setActive} {...bar} />
        ) : null}
        {navbar && config.spacious ? <box style={{ height: 1, flexShrink: 0 }} /> : null}
        <TabView key={tab.id} id={tab.id} memory={memory.current}>
          {tab.content}
        </TabView>
      </box>
    </TabsContext.Provider>
  );
}

function TabView({ id, memory, children }: { id: string; memory: Map<string, string>; children: ReactNode }) {
  const { renderer } = useSectui();
  const ref = useRef<BoxRenderable>(null);
  const panes = useRef<PaneEntry[]>([]);

  const register = useCallback((entry: PaneEntry) => {
    panes.current.push(entry);
    return () => {
      panes.current = panes.current.filter((p) => p !== entry);
    };
  }, []);

  const currentIndex = () => panes.current.findIndex((p) => containsFocus(p.ref.current, renderer.currentFocusedRenderable));

  // Panes register in their own effects, which run before this one: focus the remembered pane.
  useEffect(() => {
    const target = panes.current.find((p) => p.id === memory.get(id)) ?? panes.current[0];
    target?.focus();
  }, []);

  useFocusChange((focused: Renderable | null) => {
    const pane = panes.current.find((p) => containsFocus(p.ref.current, focused));
    if (pane) memory.set(id, pane.id);
  });

  const cycle = (delta: number) => {
    const list = panes.current;
    if (list.length === 0) return;
    const i = currentIndex();
    list[(i + delta + list.length) % list.length]!.focus();
  };

  const move = (direction: Direction) => {
    const i = currentIndex();
    if (i < 0) return cycle(0);
    const rects = panes.current.map((p) => {
      const r = p.ref.current!;
      return { x: r.screenX, y: r.screenY, width: r.width, height: r.height };
    });
    const j = nearestInDirection(rects[i]!, rects, direction);
    if (j >= 0) panes.current[j]!.focus();
  };

  useCommands(
    [
      { name: "pane.next", title: "Next pane", run: () => cycle(1) },
      { name: "pane.previous", title: "Previous pane", run: () => cycle(-1) },
      { name: "pane.left", title: "Pane left", run: () => move("left") },
      { name: "pane.down", title: "Pane down", run: () => move("down") },
      { name: "pane.up", title: "Pane up", run: () => move("up") },
      { name: "pane.right", title: "Pane right", run: () => move("right") },
    ],
    { target: ref },
  );

  return (
    <TabViewContext.Provider value={{ register }}>
      <box ref={ref} style={{ flexGrow: 1 }}>
        {children}
      </box>
    </TabViewContext.Provider>
  );
}
