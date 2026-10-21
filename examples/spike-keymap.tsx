// Spike: answers the risky questions about @opentui/keymap before building on it.
// Run: npx esbuild examples/spike-keymap.tsx --bundle --platform=node --format=esm --packages=external --outfile=dist/spike.js && node --experimental-ffi dist/spike.js
import type { BoxRenderable, InputRenderable, Renderable } from "@opentui/core";
import { CliRenderEvents } from "@opentui/core";
import { createTestRenderer } from "@opentui/core/testing";
import { createDefaultOpenTuiKeymap } from "@opentui/keymap/opentui";
import { KeymapProvider, useBindings } from "@opentui/keymap/react";
import { createRoot } from "@opentui/react";
import { useRef } from "react";

const results: [string, boolean, string][] = [];
const check = (name: string, ok: boolean, info = "") => {
  results.push([name, ok, info]);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${info ? "  — " + info : ""}`);
};

const log: string[] = [];
const refs: Record<string, Renderable | null> = {};

function Pane({ id, children }: { id: string; children?: React.ReactNode }) {
  const ref = useRef<BoxRenderable>(null);
  useBindings(
    () => ({
      targetRef: ref,
      commands: [{ name: `${id}.hit`, title: `Hit ${id}`, run: () => void log.push(`${id}.hit`) }],
      bindings: [{ key: "x", cmd: `${id}.hit`, mode: "normal" }],
    }),
    [],
  );
  return (
    <box
      ref={(r: BoxRenderable | null) => {
        ref.current = r;
        refs[id] = r;
      }}
      focusable
      border
      style={{ width: 20, height: 5 }}
    >
      {children}
    </box>
  );
}

function App() {
  useBindings(() => ({
    commands: [
      { name: "app.global", title: "Global", run: () => void log.push("app.global") },
      { name: "pane.left", title: "Pane left", run: () => void log.push("pane.left") },
    ],
    bindings: [
      { key: "g", cmd: "app.global", mode: "normal" },
      { key: "ctrl+h", cmd: "pane.left" },
      { key: "ctrl+k", cmd: "pane.left" },
    ],
  }));
  return (
    <box style={{ flexDirection: "row" }}>
      <Pane id="A">
        <text>pane A</text>
      </Pane>
      <Pane id="B">
        <input ref={(r: InputRenderable | null) => void (refs.input = r)} width={15} />
      </Pane>
    </box>
  );
}

async function run(kitty: boolean) {
  const setup = await createTestRenderer({ width: 50, height: 8, kittyKeyboard: kitty });
  const { renderer, mockInput, mockMouse } = setup;
  const keymap = createDefaultOpenTuiKeymap(renderer);
  // Insert mode: bindings with `mode: "normal"` are inactive while a text field has focus.
  keymap.registerBindingFields({ mode: (value, ctx) => ctx.require("mode", value) });
  const syncMode = () => keymap.setData("mode", renderer.currentFocusedEditor ? "insert" : "normal");
  syncMode();
  renderer.on(CliRenderEvents.FOCUSED_RENDERABLE, syncMode);
  const settle = async () => {
    await new Promise((r) => setTimeout(r, 30));
    await setup.renderOnce();
  };
  createRoot(renderer).render(
    <KeymapProvider keymap={keymap}>
      <App />
    </KeymapProvider>,
  );
  await settle();
  return { setup, renderer, mockInput, mockMouse, keymap, settle };
}

{
  const { renderer, mockInput, mockMouse, keymap, settle } = await run(false);
  const A = refs.A!,
    B = refs.B!,
    input = refs.input as InputRenderable;

  // 1. focus-within layers
  A.focus();
  await settle();
  log.length = 0;
  mockInput.pressKey("x");
  await settle();
  check("Layer on pane A active when A focused", log.join() === "A.hit", log.join());

  B.focus();
  await settle();
  log.length = 0;
  mockInput.pressKey("x");
  await settle();
  check("Layer on pane B active when B focused (not A)", log.join() === "B.hit", log.join());

  log.length = 0;
  mockInput.pressKey("g");
  await settle();
  check("Global layer active everywhere", log.join() === "app.global", log.join());

  // 2. mouse focus
  await mockMouse.click(3, 2); // inside A (A is at x 0..19)
  await settle();
  check("Mouse click focuses pane A", renderer.currentFocusedRenderable === A, String(renderer.currentFocusedRenderable?.id));

  // 3. input inside a pane: does the pane's single-letter binding swallow typing?
  input.focus();
  await settle();
  log.length = 0;
  mockInput.pressKey("x");
  await settle();
  check(
    "Insert mode: x typed in the input does not run the pane command",
    log.length === 0,
    `log=${log.join()} value=${JSON.stringify(input.value)}`,
  );

  // Insert-mode rule: unmodified bindings require mode "normal"; the mode follows the focus.
  // (Registered here after layers: field compilers must exist before the layers that use them,
  // so the spike re-registers the layers below by remounting.)
  input.value = "";
  log.length = 0;
  mockInput.typeText("xg");
  await settle();
  check("Insert rule: typing x g in input runs no command", log.length === 0, `log=${log.join()}`);
  check("Insert rule: input still receives the text", input.value === "xg", JSON.stringify(input.value));
  log.length = 0;
  mockInput.pressKey("k", { ctrl: true });
  await settle();
  check("Insert rule: ctrl bindings still work in the input (ctrl+k)", log.join() === "pane.left", `log=${log.join()}`);
  mockInput.pressKey("h", { ctrl: true });
  await settle();
  check("Legacy terminal: ctrl+h in the input acts as backspace (known limit)", input.value === "x", JSON.stringify(input.value));
  renderer.currentFocusedRenderable?.blur?.();
  A.focus();
  await settle();
  log.length = 0;
  mockInput.pressKey("g");
  await settle();
  check("Back to normal mode after leaving the input", log.join() === "app.global", log.join());

  // 4. palette queries with a focus override (focus is in B)
  B.focus();
  await settle();
  const entries = keymap.getCommandEntries({ visibility: "reachable", focused: A });
  const names = entries.map((e) => e.command.name).sort();
  check("getCommandEntries(focused: A) lists A + globals, not B", names.join() === "A.hit,app.global,pane.left", names.join());
  check(
    "Entries carry title + bindings",
    entries.some((e) => (e.command as any).title === "Hit A" && e.bindings.length === 1),
    JSON.stringify(entries.find((e) => e.command.name === "A.hit")?.bindings.map((b) => b.sequence)),
  );
  log.length = 0;
  const res = keymap.dispatchCommand("A.hit", { focused: A });
  check("dispatchCommand(A.hit, focused: A) while focus is in B", res.ok && log.join() === "A.hit", JSON.stringify(res));
  const res2 = keymap.dispatchCommand("A.hit");
  check("dispatchCommand(A.hit) without override is refused (A not focused)", !res2.ok, JSON.stringify(res2));

  // 5. hints
  A.focus();
  await settle();
  const active = keymap.getActiveKeys({ includeMetadata: true });
  check(
    "getActiveKeys with metadata (for the hint bar)",
    active.some((k) => k.display === "x" && (k.commandAttrs as any)?.title === "Hit A"),
    active.map((k) => `${k.display}:${(k.commandAttrs as any)?.title}`).join(" "),
  );
  renderer.destroy();
}

{
  const { renderer, mockInput, settle } = await run(true);
  refs.A!.focus();
  await settle();
  log.length = 0;
  mockInput.pressKey("h", { ctrl: true });
  await settle();
  check("Kitty keyboard: ctrl+h reaches the binding", log.join() === "pane.left", log.join());
  renderer.destroy();
}

const failed = results.filter((r) => !r[1]).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(0);
