import { createCliRenderer, type CliRenderer } from "@opentui/core";
import { KeymapProvider } from "@opentui/keymap/react";
import { createRoot, useTerminalDimensions } from "@opentui/react";
import { useMemo, useRef, useState, type ReactNode } from "react";
import type { SectuiConfig } from "./config/index.ts";
import { SectuiContext, useSectui, useTheme, type SectuiContextValue } from "./context.ts";
import { Tabs, type TabDef } from "./focus/tabs.tsx";
import { textareaFor } from "./editor/external.ts";
import { EditorExtensionContext, openInExternalEditor } from "./editor/use-external-editor.ts";
import { useFocusChange } from "./focus/focus.ts";
import { useCommands } from "./keymap/commands.ts";
import { createSectuiKeymap, type SectuiKeymap } from "./keymap/setup.ts";
import { createTheme } from "./theme/theme.ts";
import { CommandPalette } from "./widgets/command-palette.tsx";
import { Help } from "./widgets/help.tsx";
import { KeyHints } from "./widgets/key-hints.tsx";
import { useModalHost } from "./widgets/modal.tsx";
import { NotificationStack } from "./widgets/notifications.tsx";
import { createNotifications, type Notifications } from "./notifications/notifications.ts";

export interface SectuiProviderProps {
  config: SectuiConfig;
  renderer: CliRenderer;
  keymap: SectuiKeymap;
  notifications: Notifications;
  quit(): void;
  /** Below this size, the UI is hidden behind a centered message (it stays mounted: nothing is lost). */
  minSize?: MinSize;
  children: ReactNode;
}

export interface MinSize {
  width: number;
  height: number;
}

/** Shown instead of the UI while the terminal is smaller than `minSize`: short lines, centered. */
function TooSmall({ minSize }: { minSize: MinSize }) {
  const theme = useTheme();
  const { width, height } = useTerminalDimensions();
  return (
    <box
      position="absolute"
      left={0}
      top={0}
      width="100%"
      height="100%"
      zIndex={1000}
      style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}
    >
      <text fg={theme.warning} selectable={false}>
        Terminal too small
      </text>
      <text fg={theme.fg} selectable={false}>{`at least ${minSize.width}x${minSize.height}`}</text>
      <text fg={theme.muted} selectable={false}>{`now ${width}x${height}`}</text>
    </box>
  );
}

function SizeGuard({ minSize, children }: { minSize?: MinSize; children: ReactNode }) {
  const { width, height } = useTerminalDimensions();
  const small = minSize !== undefined && (width < minSize.width || height < minSize.height);
  // Hidden, not unmounted: the active tab, the focus and the open popups come back as they were.
  return (
    <>
      <box visible={!small} style={{ width: "100%", height: "100%" }}>
        {children}
      </box>
      {small ? <TooSmall minSize={minSize} /> : null}
    </>
  );
}

export function SectuiProvider({ config, renderer, keymap, notifications, quit, minSize, children }: SectuiProviderProps) {
  const theme = useMemo(() => createTheme(config.colors), [config.colors]);
  const { api, host } = useModalHost(renderer);
  const value = useMemo<SectuiContextValue>(
    () => ({ config, theme, renderer, keymap, modal: api, notifications, quit }),
    [config, theme, renderer, keymap, api, notifications, quit],
  );
  return (
    <KeymapProvider keymap={keymap}>
      <SectuiContext.Provider value={value}>
        <box style={{ width: "100%", height: "100%", backgroundColor: config.transparentBackground ? undefined : theme.bg }}>
          <SizeGuard minSize={minSize}>
            {children}
            {host}
            <NotificationStack notifications={notifications} />
          </SizeGuard>
        </box>
      </SectuiContext.Provider>
    </KeymapProvider>
  );
}

export interface AppShellProps {
  tabs: TabDef[];
  /** Left of the navbar, e.g. "Spilltea: client-x". */
  title?: string;
  /** Right of the navbar, e.g. "127.0.0.1:8080"; `compact` (":8080") when the tabs need the room. */
  right?: { full: string; compact?: string };
  /** Extra content on the right of the bottom bar, before the help key. */
  status?: ReactNode;
  /** false: no navbar, for a single-tab window such as a startup screen. */
  navbar?: boolean;
  /** File extension given to the external editor (editor.external), for its syntax highlighting. */
  editorExtension?: string;
}

/**
 * The main window: navbar, the active tab, and the short help at the bottom.
 * Registers the app-wide commands (quit, palette, help).
 */
export function AppShell({ tabs, title, right, status, navbar, editorExtension }: AppShellProps) {
  const { config, theme, renderer, modal, notifications, quit } = useSectui();
  // The help toggles: its key closes it too.
  const closeHelp = useRef<(() => void) | null>(null);
  // editor.external is only listed (and active) where a text area is reachable from the focus.
  const [canEdit, setCanEdit] = useState(false);
  useFocusChange(() => setCanEdit(textareaFor(renderer) !== undefined));
  const toggleHelp = () => {
    if (closeHelp.current) return closeHelp.current();
    const previous = renderer.currentFocusedRenderable;
    // Closed by its key, by escape or by a click: either way the ref is cleared when it unmounts.
    closeHelp.current = modal.open(() => <Help previous={previous} onUnmount={() => (closeHelp.current = null)} />, {
      title: "Shortcuts",
      width: "80%",
      height: "70%",
    });
  };
  useCommands([
    { name: "app.quit", title: "Quit", run: quit },
    {
      name: "editor.external",
      title: "Edit in $EDITOR",
      enabled: canEdit,
      run: () => {
        const textarea = textareaFor(renderer);
        if (!textarea) return false;
        openInExternalEditor(renderer, notifications, textarea, editorExtension ?? ".txt");
      },
    },
    { name: "app.help", title: "Help", run: toggleHelp },
    {
      name: "app.palette",
      title: "Commands",
      run: () => {
        const previous = renderer.currentFocusedRenderable;
        modal.open((close) => <CommandPalette previous={previous} close={close} />, { title: "Commands", width: "70%", height: "50%" });
      },
    },
  ]);
  return (
    <EditorExtensionContext.Provider value={editorExtension ?? ".txt"}>
      <box style={{ flexDirection: "column", flexGrow: 1 }}>
        <Tabs tabs={tabs} bar={{ title, right }} navbar={navbar} />
        {config.helpBar ? (
          <>
            {config.spacious ? <box style={{ height: 1, flexShrink: 0 }} /> : null}
            {/* A click opens the help; the next one lands on the popup's backdrop, which closes it. */}
            <box
              style={{ flexDirection: "row", height: 1, flexShrink: 0, backgroundColor: theme.bgAlt, paddingLeft: 1, paddingRight: 1 }}
              onMouseDown={toggleHelp}
            >
              <KeyHints />
              {status ? <box style={{ flexShrink: 0, marginLeft: 2 }}>{status}</box> : null}
            </box>
          </>
        ) : null}
      </box>
    </EditorExtensionContext.Provider>
  );
}

export interface StartAppOptions {
  /** Create them before the UI to notify from stores and other non-React code. */
  notifications?: Notifications;
  /** Smallest terminal the tool supports; below it a centered message replaces the UI. */
  minSize?: MinSize;
}

export interface SectuiApp {
  renderer: CliRenderer;
  /**
   * Replaces what is shown, keeping the renderer, the keymap and the notifications.
   * `config` may change: a startup screen runs with the user's config, the main
   * window with a project's own settings on top.
   */
  render(config: SectuiConfig, element: ReactNode): void;
  /** Tears the UI down and gives the terminal back (to print an error and exit, for example). */
  close(): Promise<void>;
}

/** Creates the renderer (Kitty keyboard on), the keymap, and renders `element` inside a <SectuiProvider>. */
export async function startApp(config: SectuiConfig, element: ReactNode, options: StartAppOptions = {}): Promise<SectuiApp> {
  const background = (c: SectuiConfig) => (c.transparentBackground ? "transparent" : createTheme(c.colors).bg);
  const renderer = await createCliRenderer({
    exitOnCtrlC: false,
    useKittyKeyboard: {},
    backgroundColor: background(config),
    // OpenTUI's default list includes SIGPIPE: a peer closing a socket (routine for a
    // network tool) would tear the UI down and leave the process running. The
    // signals are handled below instead, and they exit the process.
    exitSignals: [],
  });
  const keymap = createSectuiKeymap(renderer);
  const notifications = options.notifications ?? createNotifications();
  const quit = () => {
    renderer.destroy();
    void renderer.closed.then(() => process.exit(0));
  };
  for (const signal of ["SIGINT", "SIGTERM", "SIGQUIT", "SIGHUP"] as const) process.once(signal, quit);
  const root = createRoot(renderer);
  const render = (current: SectuiConfig, content: ReactNode) => {
    renderer.setBackgroundColor(background(current));
    root.render(
      <SectuiProvider
        config={current}
        renderer={renderer}
        keymap={keymap}
        notifications={notifications}
        quit={quit}
        minSize={options.minSize}
      >
        {content}
      </SectuiProvider>,
    );
  };
  render(config, element);
  return {
    renderer,
    render,
    async close() {
      renderer.destroy();
      await renderer.closed;
    },
  };
}
