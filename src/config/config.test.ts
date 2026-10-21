import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import * as v from "valibot";
import { ConfigError, loadConfig, mergeLayers, setFlagsLayer, SectuiConfigSchema, yamlLayer } from "./index.ts";

const defaultsYaml = readFileSync(new URL("../../config.default.yaml", import.meta.url), "utf8");
const defaults = () => yamlLayer("config.default.yaml", defaultsYaml);
// The palette is the user's choice: compare with the file, never with hardcoded colors.
const defaultColors = (yamlLayer("x", defaultsYaml).data as { colors: Record<string, string> }).colors;

test("config.default.yaml is valid", () => {
  const config = loadConfig(SectuiConfigSchema, [defaults()]);
  assert.equal(config.borderStyle, "rounded");
  assert.equal(config.colors.base0D, defaultColors.base0D);
  assert.deepEqual(config.keys["pane.left"], ["ctrl+h", "alt+h"]);
});

test("objects merge key by key, later layers win", () => {
  const config = loadConfig(SectuiConfigSchema, [
    defaults(),
    { source: "user.yaml", data: { colors: { base08: "#ff0000" }, keys: { "app.quit": "ctrl+q" } } },
  ]);
  assert.equal(config.colors.base08, "#ff0000");
  assert.equal(config.colors.base00, defaultColors.base00); // untouched sibling
  assert.equal(config.keys["app.quit"], "ctrl+q");
  assert.equal(config.keys["app.palette"], "ctrl+p"); // untouched sibling
});

test("lists are replaced, not concatenated", () => {
  const config = loadConfig(SectuiConfigSchema, [defaults(), { source: "user.yaml", data: { keys: { "pane.left": ["h"] } } }]);
  assert.deepEqual(config.keys["pane.left"], ["h"]);
});

test("errors name the file that set the bad value", () => {
  assert.throws(
    () => loadConfig(SectuiConfigSchema, [defaults(), { source: "/p/config.yaml", data: { borderStyle: "dotted" } }]),
    (e: ConfigError) => e.issues.length === 1 && e.issues[0]!.startsWith("/p/config.yaml: borderStyle:"),
  );
});

test("unknown keys are rejected", () => {
  assert.throws(() => loadConfig(SectuiConfigSchema, [defaults(), { source: "user.yaml", data: { nerdFont: true } }]), ConfigError);
});

test("-c flags: YAML values, dotted command names under keys.", () => {
  const layer = setFlagsLayer(["emoji=true", "colors.base08=#ff0000", "keys.app.quit=[q, ctrl+c]"]);
  assert.deepEqual(layer.data, { emoji: true, colors: { base08: "#ff0000" }, keys: { "app.quit": ["q", "ctrl+c"] } });
  const config = loadConfig(SectuiConfigSchema, [defaults(), layer]);
  assert.equal(config.emoji, true);
});

test("tools extend the shared schema", () => {
  const { sectuiEntries } = { sectuiEntries: SectuiConfigSchema.entries };
  const ToolSchema = v.strictObject({ ...sectuiEntries, saveResponse: v.boolean() });
  const config = loadConfig(ToolSchema, [defaults(), { source: "tool.default.yaml", data: { saveResponse: true } }]);
  assert.equal(config.saveResponse, true);
});

test("merged result is frozen", () => {
  const config = loadConfig(SectuiConfigSchema, [defaults()]);
  assert.throws(() => {
    (config as { emoji: boolean }).emoji = true;
  });
  assert.ok(Object.isFrozen(mergeLayers([defaults()]).value) === false); // only the validated output is frozen
});
