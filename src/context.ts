import type { CliRenderer } from "@opentui/core";
import { createContext, useContext, type ReactNode } from "react";
import type { SectuiConfig } from "./config/index.ts";
import type { SectuiKeymap } from "./keymap/setup.ts";
import type { Notifications } from "./notifications/notifications.ts";
import type { Theme } from "./theme/theme.ts";

export interface ModalOptions {
  title?: string;
  width?: number | `${number}%`;
  height?: number | `${number}%`;
}

export interface ModalApi {
  /** Opens a modal window on top of everything. `render` receives `close`. */
  open(render: (close: () => void) => ReactNode, options?: ModalOptions): () => void;
}

export interface SectuiContextValue {
  /** Shared settings (a tool's config extends it). */
  config: SectuiConfig;
  theme: Theme;
  renderer: CliRenderer;
  keymap: SectuiKeymap;
  modal: ModalApi;
  /** Toasts. Also usable outside React: create them with createNotifications() and pass them to startApp. */
  notifications: Notifications;
  quit(): void;
}

export const SectuiContext = createContext<SectuiContextValue | null>(null);

export function useSectui(): SectuiContextValue {
  const ctx = useContext(SectuiContext);
  if (!ctx) throw new Error("useSectui: wrap the tree in <SectuiProvider> (see startApp)");
  return ctx;
}

export const useTheme = () => useSectui().theme;
export const useSectuiConfig = () => useSectui().config;
/** `notify(message, { level, title, timeoutMs })` */
export const useNotify = () => useSectui().notifications.notify;
