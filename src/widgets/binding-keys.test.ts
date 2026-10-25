import assert from "node:assert/strict";
import { test } from "node:test";
import { bindingKeys } from "./binding-keys.ts";

const binding = (...keys: string[]) => ({ sequence: keys.map((display) => ({ display })) });

test("keys registered by two layers are shown once, in first-seen order", () => {
  const layers = [binding("ctrl+l"), binding("meta+l"), binding("ctrl+l"), binding("meta+l")];
  assert.deepEqual(bindingKeys(layers), ["ctrl+l", "meta+l"]);
});

test("a sequence is joined into one key", () => {
  assert.deepEqual(bindingKeys([binding("g", "g"), binding("shift+g"), binding("g", "g")]), ["gg", "shift+g"]);
});

test("no bindings: no keys", () => {
  assert.deepEqual(bindingKeys([]), []);
});
