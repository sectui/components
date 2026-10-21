import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { yamlLayer, type ConfigLayer } from "./config/index.ts";

// Read through the package name, not a path relative to this file: in a tool bundled with
// esbuild, import.meta.url is the bundle's, and the package is its dependency in node_modules.
const defaultsPath = () => fileURLToPath(import.meta.resolve("@sectui/components/config.default.yaml"));

/** The shared defaults (config.default.yaml of this package) as the first config layer. */
export const sectuiDefaultsLayer = (): ConfigLayer =>
  yamlLayer("@sectui/components/config.default.yaml", readFileSync(defaultsPath(), "utf8"));
