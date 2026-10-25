interface Binding {
  sequence: readonly { display: string }[];
}

/**
 * The keys of a command entry as shown to the user, each once, in the keymap's order.
 * A command registered by several layers (e.g. the lib's pane.right refined by an app
 * for one pane) gets the same keys from `config.keys` on every layer.
 */
export function bindingKeys(bindings: readonly Binding[]): string[] {
  return [...new Set(bindings.map((b) => b.sequence.map((s) => s.display).join("")))];
}
