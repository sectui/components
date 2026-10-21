// Layered config: merge YAML layers, remember which layer set each path,
// validate the result and report errors with the file that caused them.
import * as v from "valibot";

export interface ConfigLayer {
  /** Shown in errors: a file path, "defaults", "command line"… */
  source: string;
  data: unknown;
}

export interface Merged {
  value: Record<string, unknown>;
  /** "proxy.listen" -> source of the layer that last set it */
  sources: Map<string, string>;
}

const isPlainObject = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

/** Objects merge key by key, everything else (lists included) replaces. Later layers win. */
export function mergeLayers(layers: ConfigLayer[]): Merged {
  const value: Record<string, unknown> = {};
  const sources = new Map<string, string>();

  const mergeInto = (target: Record<string, unknown>, data: Record<string, unknown>, prefix: string, source: string) => {
    for (const [key, incoming] of Object.entries(data)) {
      const path = prefix ? `${prefix}.${key}` : key;
      const current = target[key];
      if (isPlainObject(incoming) && isPlainObject(current)) {
        mergeInto(current, incoming, path, source);
      } else {
        target[key] = isPlainObject(incoming) ? structuredClone(incoming) : incoming;
        for (const p of [...sources.keys()]) if (p.startsWith(path + ".")) sources.delete(p);
        sources.set(path, source);
      }
    }
  };

  for (const layer of layers) {
    if (layer.data === undefined || layer.data === null) continue;
    if (!isPlainObject(layer.data)) {
      throw new ConfigError([`${layer.source}: expected a mapping at the top level`]);
    }
    mergeInto(value, layer.data, "", layer.source);
  }
  return { value, sources };
}

/** Source of the layer responsible for `path`: the path itself or its closest ancestor. */
export function sourceOf(sources: Map<string, string>, path: string): string | undefined {
  for (let p = path; p; p = p.includes(".") ? p.slice(0, p.lastIndexOf(".")) : "") {
    const s = sources.get(p);
    if (s) return s;
  }
  return undefined;
}

export class ConfigError extends Error {
  readonly issues: string[];
  constructor(issues: string[]) {
    super(`Invalid configuration:\n${issues.map((i) => `  ${i}`).join("\n")}`);
    this.name = "ConfigError";
    this.issues = issues;
  }
}

export function validateMerged<S extends v.GenericSchema>(schema: S, merged: Merged): v.InferOutput<S> {
  const result = v.safeParse(schema, merged.value);
  if (result.success) return deepFreeze(result.output);
  const issues = result.issues.map((issue) => {
    const path = v.getDotPath(issue) ?? "";
    // Unknown keys report the parent path; name the key itself.
    const where = sourceOf(merged.sources, path) ?? "defaults";
    return `${where}: ${path || "(root)"}: ${issue.message}`;
  });
  throw new ConfigError(issues);
}

export function loadConfig<S extends v.GenericSchema>(schema: S, layers: ConfigLayer[]): v.InferOutput<S> {
  return validateMerged(schema, mergeLayers(layers));
}

function deepFreeze<T>(x: T): T {
  if (typeof x === "object" && x !== null) {
    for (const value of Object.values(x)) deepFreeze(value);
    Object.freeze(x);
  }
  return x;
}
