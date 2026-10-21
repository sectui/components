// Edit a text in the user's own editor ($VISUAL, $EDITOR, vi): the TUI is
// suspended while the editor runs in the terminal, then resumes.
import { TextareaRenderable, type CliRenderer, type Renderable } from "@opentui/core";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const editorCommand = () => process.env.VISUAL || process.env.EDITOR || "vi";

export type ExternalEditResult = { ok: true; text: string } | { ok: false; error: string };

/**
 * Opens `text` in the external editor and returns the edited text, or why it
 * failed (the editor could not start, or exited with an error). The file lives
 * in a private directory (0700, file 0600: it may hold tokens) removed afterwards.
 */
export async function editExternally(renderer: CliRenderer, text: string, extension = ".txt"): Promise<ExternalEditResult> {
  const dir = await mkdtemp(join(tmpdir(), "sectui-edit-"));
  const file = join(dir, `edit${extension}`);
  try {
    await writeFile(file, text, { mode: 0o600 });
    await renderer.suspend();
    let code: number | null;
    try {
      // Through sh: $EDITOR may carry arguments ("code --wait"). The file is passed as $1, never parsed.
      code = await new Promise<number | null>((resolve, reject) => {
        // All three streams stay on the terminal: full-screen editors may draw on stderr.
        const child = spawn("sh", ["-c", `${editorCommand()} "$1"`, "sh", file], { stdio: "inherit" });
        child.on("error", reject);
        child.on("exit", resolve);
      });
    } finally {
      await renderer.resume();
    }
    if (code === 0) return { ok: true, text: await readFile(file, "utf8") };
    // sh reports a missing command as 127 and a non-executable one as 126.
    const why = code === 127 ? "command not found" : code === 126 ? "not executable" : `exited with code ${code}`;
    return { ok: false, error: `${editorCommand()}: ${why}. Set $VISUAL or $EDITOR.` };
  } catch (e) {
    return { ok: false, error: `Cannot start ${editorCommand()}: ${(e as Error).message}` };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** The textarea to edit: the focused one, or the first one inside the focused renderable (a pane). */
export function textareaFor(renderer: CliRenderer): TextareaRenderable | undefined {
  if (renderer.currentFocusedEditor instanceof TextareaRenderable) return renderer.currentFocusedEditor;
  const find = (node: Renderable | null): TextareaRenderable | undefined => {
    if (!node) return undefined;
    if (node instanceof TextareaRenderable) return node;
    for (const child of node.getChildren()) {
      const found = find(child as Renderable);
      if (found) return found;
    }
    return undefined;
  };
  return find(renderer.currentFocusedRenderable);
}
