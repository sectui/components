export * from "./config/index.ts";
export { sectuiDefaultsLayer } from "./defaults.ts";
export { loadAppConfig, type AppConfigSources } from "./load.ts";

export { createTheme, type Theme } from "./theme/theme.ts";
export { useNotify, useSectui, useSectuiConfig, useTheme, type ModalApi, type ModalOptions, type SectuiContextValue } from "./context.ts";
export { AppShell, SectuiProvider, startApp, type AppShellProps, type MinSize, type SectuiApp, type StartAppOptions } from "./app.tsx";
export {
  createNotifications,
  type Notification,
  type NotificationLevel,
  type Notifications,
  type NotifyOptions,
} from "./notifications/notifications.ts";
export { NotificationStack } from "./widgets/notifications.tsx";

export { createSectuiKeymap, isNormalModeOnly, type SectuiKeymap } from "./keymap/setup.ts";
export { editExternally, editorCommand, textareaFor, type ExternalEditResult } from "./editor/external.ts";
export { openInExternalEditor, useExternalEditor } from "./editor/use-external-editor.ts";
export { useCommands, type CommandDef, type UseCommandsOptions } from "./keymap/commands.ts";

export { containsFocus, useFocusChange, useFocusWithin } from "./focus/focus.ts";
export { nearestInDirection, type Direction, type Rect } from "./focus/navigation.ts";
export { Tabs, useTabs, type TabDef, type TabsApi } from "./focus/tabs.tsx";
export { Pane, usePaneCommands, type PaneProps } from "./focus/pane.tsx";

export { TabBar, type TabBarProps } from "./widgets/tab-bar.tsx";
export { Badge, badgeWidth, type BadgeProps, type BadgeRound } from "./widgets/badge.tsx";
export { fitTabs, type TabsFit } from "./widgets/fit-tabs.ts";
export { Help } from "./widgets/help.tsx";
export { KeyHints, useHints, type Hint } from "./widgets/key-hints.tsx";
export { CommandPalette } from "./widgets/command-palette.tsx";
