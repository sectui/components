import type * as v from "valibot";
import { loadConfig, readYamlLayer, sectuiUserConfigPath, setFlagsLayer, type ConfigLayer } from "./config/index.ts";
import { sectuiDefaultsLayer } from "./defaults.ts";

export interface AppConfigSources {
  /** The tool's config.default.yaml, as a layer. */
  toolDefaults?: ConfigLayer;
  /** e.g. ~/.config/spilltea/config.yaml */
  toolConfigPath?: string;
  /** e.g. <project>/config.yaml */
  projectConfigPath?: string;
  /** Layers built from dedicated CLI flags (--listen…), applied before -c. */
  cliLayers?: ConfigLayer[];
  /** Values of -c key=value. */
  setFlags?: string[];
}

/**
 * Loads a tool's config. Layers, later wins:
 *   sectui defaults < tool defaults < ~/.config/sectui/config.yaml < tool config < project config < CLI
 */
export async function loadAppConfig<S extends v.GenericSchema>(schema: S, sources: AppConfigSources = {}): Promise<v.InferOutput<S>> {
  const layers: ConfigLayer[] = [sectuiDefaultsLayer()];
  if (sources.toolDefaults) layers.push(sources.toolDefaults);
  layers.push(await readYamlLayer(sectuiUserConfigPath()));
  if (sources.toolConfigPath) layers.push(await readYamlLayer(sources.toolConfigPath));
  if (sources.projectConfigPath) layers.push(await readYamlLayer(sources.projectConfigPath));
  layers.push(...(sources.cliLayers ?? []));
  if (sources.setFlags?.length) layers.push(setFlagsLayer(sources.setFlags));
  return loadConfig(schema, layers);
}
