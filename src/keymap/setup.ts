import { CliRenderEvents, type CliRenderer } from "@opentui/core";
import { createDefaultOpenTuiKeymap } from "@opentui/keymap/opentui";

export type SectuiKeymap = ReturnType<typeof createDefaultOpenTuiKeymap>;

/**
 * The OpenTUI keymap plus the normal/insert rule: a binding with `mode: "normal"`
 * is inactive while a text field (input, textarea) has the focus, so typing
 * reaches the field. The mode follows the renderer focus.
 */
export function createSectuiKeymap(renderer: CliRenderer): SectuiKeymap {
  const keymap = createDefaultOpenTuiKeymap(renderer);
  keymap.registerBindingFields({ mode: (value, ctx) => ctx.require("mode", value) });
  // `hint: true` puts a command in the short help (bottom bar); every command is in the "?" help.
  keymap.registerCommandFields({ hint: (value, ctx) => ctx.attr("hint", value === true) });
  const syncMode = () => keymap.setData("mode", renderer.currentFocusedEditor ? "insert" : "normal");
  syncMode();
  renderer.on(CliRenderEvents.FOCUSED_RENDERABLE, syncMode);
  return keymap;
}

const COMMAND_MODIFIERS = /(^|\+)(ctrl|control|alt|option|meta|super|hyper)\+/i;
const EDITING_KEYS = new Set(["space", "tab", "return", "enter", "linefeed", "backspace", "delete", "left", "right", "home", "end"]);

/**
 * Keys a text field needs are limited to normal mode: printable characters and
 * editing keys, without ctrl/alt/meta. Other keys (escape, up, down, f1…) stay
 * active while typing, so a popup can use them around its input.
 */
export function isNormalModeOnly(key: string): boolean {
  if (COMMAND_MODIFIERS.test(key)) return false;
  const base = key.replace(/^shift\+/i, "");
  return [...base].length === 1 || EDITING_KEYS.has(base.toLowerCase());
}
