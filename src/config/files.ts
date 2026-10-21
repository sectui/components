import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { parse } from "yaml";
import { ConfigError, type ConfigLayer } from "./merge.ts";

/** $XDG_CONFIG_HOME/<name>, ~/.config/<name> by default. */
export function configDir(name: string): string {
  return join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), name);
}

/** The shared sectui user config: ~/.config/sectui/config.yaml */
export const sectuiUserConfigPath = () => join(configDir("sectui"), "config.yaml");

export function yamlLayer(source: string, text: string): ConfigLayer {
  try {
    return { source, data: parse(text) ?? undefined };
  } catch (e) {
    throw new ConfigError([`${source}: ${(e as Error).message.split("\n")[0]}`]);
  }
}

/** A YAML file as a layer. A missing file is an empty layer, not an error. */
export async function readYamlLayer(path: string): Promise<ConfigLayer> {
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return { source: path, data: undefined };
    throw new ConfigError([`${path}: ${(e as Error).message}`]);
  }
  return yamlLayer(path, text);
}

/**
 * `-c a.b.c=value` flags, git style, as one layer. Values are parsed as YAML,
 * so `-c proxy.maxBodySize=0` is a number and `-c keys.app.quit=[q, ctrl+c]` a list
 * (after `keys.`, the rest is the command name, dots included).
 */
export function setFlagsLayer(flags: string[], source = "command line"): ConfigLayer {
  const data: Record<string, unknown> = {};
  for (const flag of flags) {
    const eq = flag.indexOf("=");
    if (eq <= 0) throw new ConfigError([`${source}: -c ${flag}: expected key=value`]);
    // Command names contain dots: everything after "keys." is one key.
    const key = flag.slice(0, eq);
    const path = key.startsWith("keys.") ? ["keys", key.slice(5)] : key.split(".");
    const raw = flag.slice(eq + 1);
    let value: unknown;
    try {
      value = parse(raw);
    } catch {
      value = raw;
    }
    // "#ff0000" is a YAML comment: keep the text unless null was really meant.
    if (value === null && !["null", "~", ""].includes(raw.trim())) value = raw;
    let node = data;
    for (const key of path.slice(0, -1)) {
      node[key] ??= {};
      node = node[key] as Record<string, unknown>;
    }
    node[path.at(-1)!] = value;
  }
  return { source, data };
}
