// No UI imports here: tools can load their config before starting OpenTUI.
// The defaults file is not imported here (it needs a bundler loader for .yaml),
// see src/defaults.ts.
export { ConfigError, loadConfig, mergeLayers, sourceOf, validateMerged } from "./merge.ts";
export type { ConfigLayer, Merged } from "./merge.ts";
export { configDir, readYamlLayer, sectuiUserConfigPath, setFlagsLayer, yamlLayer } from "./files.ts";
export { BASE24_KEYS, SectuiConfigSchema, sectuiEntries } from "./schema.ts";
export type { Base24Key, Keys, SectuiConfig } from "./schema.ts";
