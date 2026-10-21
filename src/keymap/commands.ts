import type { Renderable } from "@opentui/core";
import type { CommandContext } from "@opentui/keymap";
import { useBindings } from "@opentui/keymap/react";
import { useRef, type RefObject } from "react";
import { useSectui } from "../context.ts";
import { isNormalModeOnly } from "./setup.ts";

export interface CommandDef {
  /** `<scope>.<action>`, e.g. `intercept.forward`. Shortcuts come from `keys` in the config. */
  name: string;
  /** Shown in the hint bar and the command palette. */
  title: string;
  desc?: string;
  category?: string;
  /** false: listed nowhere and not runnable (the state does not allow it right now). */
  enabled?: boolean;
  /** true: shown in the short help at the bottom. Every command is listed in the "?" help. */
  hint?: boolean;
  /** Return false to let the next matching command handle the key. */
  run(ctx: CommandContext): void | false;
}

export interface UseCommandsOptions {
  /** Active only while the focus is inside this renderable. Omit for a global layer. */
  target?: RefObject<Renderable | null>;
  /** "focus-within" (default with a target) or "focus" (the target itself must have the focus). */
  targetMode?: "focus" | "focus-within";
  priority?: number;
}

const keyList = (value: string | readonly string[] | undefined): readonly string[] =>
  value === undefined ? [] : typeof value === "string" ? [value] : value;

/**
 * Registers commands for the component's lifetime. Their shortcuts are read from
 * `keys` in the config, never hardcoded. Unmodified keys only work in normal mode.
 */
export function useCommands(defs: CommandDef[], options: UseCommandsOptions = {}) {
  const { config } = useSectui();
  // Handlers change every render; the layer is rebuilt only when what it shows changes.
  const latest = useRef(defs);
  latest.current = defs;
  const signature = JSON.stringify(defs.map((d) => [d.name, d.title, d.desc, d.category, d.enabled !== false, d.hint === true]));

  useBindings(() => {
    const commands = defs.map((d) => ({
      name: d.name,
      title: d.title,
      desc: d.desc,
      category: d.category,
      enabled: d.enabled !== false,
      hint: d.hint === true,
      run: (ctx: CommandContext) => latest.current.find((x) => x.name === d.name)?.run(ctx),
    }));
    const bindings = defs.flatMap((d) =>
      keyList(config.keys[d.name]).map((key) => (isNormalModeOnly(key) ? { key, cmd: d.name, mode: "normal" } : { key, cmd: d.name })),
    );
    return options.target
      ? { targetRef: options.target, targetMode: options.targetMode, priority: options.priority, commands, bindings }
      : { priority: options.priority, commands, bindings };
  }, [signature, config.keys, options.target, options.targetMode, options.priority]);
}
