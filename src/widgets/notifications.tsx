import type { MouseEvent } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/react";
import { useSyncExternalStore } from "react";
import { useSectui } from "../context.ts";
import type { NotificationLevel, Notifications } from "../notifications/notifications.ts";

/** Glyphs: Nerd Font icons when the config allows them, plain characters otherwise. */
const ICONS: Record<NotificationLevel, { nerd: string; plain: string }> = {
  info: { nerd: "", plain: "i" },
  success: { nerd: "", plain: "✓" },
  warning: { nerd: "", plain: "!" },
  error: { nerd: "", plain: "✗" },
};

/**
 * The toasts: top right, below the navbar, above popups. They never take the
 * focus; a click dismisses one (and reaches nothing behind it).
 */
export function NotificationStack({ notifications }: { notifications: Notifications }) {
  const { config, theme } = useSectui();
  const { width } = useTerminalDimensions();
  const items = useSyncExternalStore(notifications.subscribe, notifications.list);
  if (items.length === 0) return null;

  const color: Record<NotificationLevel, string> = { info: theme.info, success: theme.success, warning: theme.warning, error: theme.error };
  const boxWidth = Math.max(24, Math.min(56, Math.floor(width * 0.4)));

  return (
    <box position="absolute" top={1} right={1} zIndex={300} width={boxWidth} style={{ flexDirection: "column" }}>
      {[...items].reverse().map((n) => (
        <box
          key={n.id}
          border
          borderStyle={config.borderStyle}
          borderColor={color[n.level]}
          backgroundColor={theme.bgAlt}
          title={n.title ? ` ${n.title} ` : undefined}
          style={{ flexDirection: "row", gap: 1, flexShrink: 0 }}
          onMouseDown={(e: MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
            notifications.dismiss(n.id);
          }}
        >
          <text fg={color[n.level]} style={{ flexShrink: 0 }}>
            {config.nerdFonts ? ICONS[n.level].nerd : ICONS[n.level].plain}
          </text>
          <text fg={theme.fg} style={{ flexGrow: 1, flexShrink: 1 }}>
            {n.message}
          </text>
        </box>
      ))}
    </box>
  );
}
