// Demo of @sectui/components: window / tab / pane focus, context-aware shortcuts,
// command palette, modal popup, insert mode, theme. Run: npm run demo
import type { InputRenderable } from "@opentui/core";
import { useEffect, useReducer, useRef, useState } from "react";
import {
  AppShell,
  loadAppConfig,
  Pane,
  SectuiConfigSchema,
  startApp,
  useFocusChange,
  usePaneCommands,
  useSectui,
  useTheme,
  yamlLayer,
} from "../src/index.ts";

// A tool ships its own defaults, including the keys of its own commands.
const demoDefaults = yamlLayer(
  "demo defaults",
  `
keys:
  list.down: [j, down]
  list.up: [k, up]
  list.flag: m
  request.edit: e
  response.popup: p
`,
);

const flows = ["GET /", "POST /login", "GET /api/me", "GET /static/app.js", "DELETE /api/session"];

// Commands dispatch actions instead of reading render-time state: several keys
// can arrive before the next render (j j m must flag the third row).
type ListState = { selected: number; flagged: ReadonlySet<number> };
function listReducer(state: ListState, action: "down" | "up" | "flag"): ListState {
  switch (action) {
    case "down":
      return { ...state, selected: Math.min(flows.length - 1, state.selected + 1) };
    case "up":
      return { ...state, selected: Math.max(0, state.selected - 1) };
    case "flag": {
      const flagged = new Set(state.flagged);
      flagged.has(state.selected) ? flagged.delete(state.selected) : flagged.add(state.selected);
      return { ...state, flagged };
    }
  }
}

function FlowList() {
  const theme = useTheme();
  const [{ selected, flagged }, dispatch] = useReducer(listReducer, { selected: 0, flagged: new Set<number>() });
  usePaneCommands([
    { name: "list.down", title: "Down", run: () => dispatch("down") },
    { name: "list.up", title: "Up", run: () => dispatch("up") },
    { name: "list.flag", hint: true, title: flagged.has(selected) ? "Unflag" : "Flag", run: () => dispatch("flag") },
  ]);
  return flows.map((f, i) => (
    <text key={f} bg={i === selected ? theme.selection : undefined} fg={flagged.has(i) ? theme.warning : theme.fg}>
      {`${i === selected ? ">" : " "}${flagged.has(i) ? "●" : " "} ${f}`}
    </text>
  ));
}

/** Shows which pane has the focus and the keyboard mode (useful to check the demo). */
function FocusStatus() {
  const { renderer, theme } = useSectui();
  const [label, setLabel] = useState("");
  const update = () => {
    let pane = "none";
    for (let n = renderer.currentFocusedRenderable; n; n = n.parent as typeof n) {
      if (n.id.startsWith("pane:")) {
        pane = n.id.slice(5);
        break;
      }
    }
    setLabel(`focus:${pane} mode:${renderer.currentFocusedEditor ? "insert" : "normal"}`);
  };
  useFocusChange(update);
  useEffect(update, []);
  return (
    <text fg={theme.info} style={{ flexShrink: 0 }}>
      {label}
    </text>
  );
}

function Request() {
  const theme = useTheme();
  const input = useRef<InputRenderable>(null);
  usePaneCommands([{ name: "request.edit", hint: true, title: "Edit header", run: () => input.current?.focus() }]);
  return (
    <>
      <text fg={theme.muted}>X-Bug-Bounty header (press e, then escape):</text>
      <input ref={input} placeholder="my-handle" />
    </>
  );
}

function Response() {
  const { modal, theme } = useSectui();
  const [answer, setAnswer] = useState("none yet");
  usePaneCommands([
    {
      name: "response.popup",
      hint: true,
      title: "Popup",
      run: () => {
        modal.open(
          (close) => (
            <PopupBody
              onPick={(v) => {
                setAnswer(v);
                close();
              }}
            />
          ),
          { title: "Save response", width: 50, height: 9 },
        );
      },
    },
  ]);
  return (
    <>
      <text fg={theme.success}>HTTP/2 200</text>
      <text fg={theme.muted}>{`popup answer: ${answer}`}</text>
    </>
  );
}

function PopupBody({ onPick }: { onPick(v: string): void }) {
  const theme = useTheme();
  const [name, setName] = useState("response.json");
  return (
    <>
      <text fg={theme.fg}>File name (enter to save, escape to cancel):</text>
      <input focused value={name} onInput={setName} onSubmit={() => onPick(name)} />
    </>
  );
}

function Settings() {
  const { config, theme } = useSectui();
  return (
    <Pane id="settings" title="Shared config" style={{ flexGrow: 1 }}>
      <text fg={theme.fg}>{`borderStyle: ${config.borderStyle}   nerdFonts: ${config.nerdFonts}   emoji: ${config.emoji}`}</text>
      <box style={{ flexDirection: "row", marginTop: 1 }}>
        {Object.entries(theme.base).map(([k, color]) => (
          <text key={k} bg={color}>
            {"  "}
          </text>
        ))}
      </box>
      <text fg={theme.muted}>base00 … base17 (theme.base) — roles: theme.accent, theme.error…</text>
    </Pane>
  );
}

const config = await loadAppConfig(SectuiConfigSchema, { toolDefaults: demoDefaults, setFlags: process.argv.slice(2) });

await startApp(
  config,
  <AppShell
    title="sectui demo"
    right={{ full: "127.0.0.1:8080", compact: ":8080" }}
    status={<FocusStatus />}
    tabs={[
      {
        id: "traffic",
        title: "Traffic",
        content: (
          <box style={{ flexDirection: "row", flexGrow: 1 }}>
            <Pane id="list" title="Flows" style={{ width: "35%" }}>
              <FlowList />
            </Pane>
            <box style={{ flexDirection: "column", flexGrow: 1 }}>
              <Pane id="request" title="Request" style={{ flexGrow: 1 }}>
                <Request />
              </Pane>
              <Pane id="response" title="Response" style={{ flexGrow: 1 }}>
                <Response />
              </Pane>
            </box>
          </box>
        ),
      },
      { id: "settings", title: "Settings", content: <Settings /> },
    ]}
  />,
);
