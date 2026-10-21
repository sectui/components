import type { CliRenderer, TextareaRenderable } from "@opentui/core";
import { createContext, useContext } from "react";
import { useSectui } from "../context.ts";
import type { Notifications } from "../notifications/notifications.ts";
import { editExternally } from "./external.ts";

/** The extension given to edited files (AppShell's editorExtension). */
export const EditorExtensionContext = createContext(".txt");

/**
 * Opens `textarea` in $VISUAL / $EDITOR and puts the result back: replaceText
 * keeps the undo history and fires onContentChange, like typing. A failure is
 * notified. The focus returns where it was.
 */
export function openInExternalEditor(renderer: CliRenderer, notifications: Notifications, textarea: TextareaRenderable, extension: string) {
  const focus = renderer.currentFocusedRenderable;
  void editExternally(renderer, textarea.plainText, extension).then((result) => {
    if (result.ok && result.text !== textarea.plainText) textarea.replaceText(result.text);
    if (!result.ok) notifications.notify(result.error, { level: "error", title: "External editor" });
    focus?.focus();
  });
}

/**
 * For a pane whose text area lives elsewhere (a list above its preview): register
 * your own `editor.external` command that calls this with that text area.
 */
export function useExternalEditor(): (textarea: TextareaRenderable) => void {
  const { renderer, notifications } = useSectui();
  const extension = useContext(EditorExtensionContext);
  return (textarea) => openInExternalEditor(renderer, notifications, textarea, extension);
}
