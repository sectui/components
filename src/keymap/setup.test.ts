import assert from "node:assert/strict";
import { test } from "node:test";
import { isNormalModeOnly } from "./setup.ts";

test("keys that type text are normal-mode only", () => {
  for (const key of ["f", "]", "shift+g", "space", "tab", "shift+tab", "enter", "backspace", "left"]) {
    assert.equal(isNormalModeOnly(key), true, key);
  }
});

test("modified and non-editing keys stay active while typing", () => {
  for (const key of ["ctrl+p", "alt+h", "ctrl+shift+s", "escape", "up", "down", "f1", "pageup"]) {
    assert.equal(isNormalModeOnly(key), false, key);
  }
});
