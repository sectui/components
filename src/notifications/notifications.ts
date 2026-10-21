// Notifications: short messages shown as toasts, independent of React so any
// code (a store, a command, a background task) can send one.

export type NotificationLevel = "info" | "success" | "warning" | "error";

export interface Notification {
  id: number;
  level: NotificationLevel;
  title?: string;
  message: string;
}

export interface NotifyOptions {
  level?: NotificationLevel;
  title?: string;
  /** Milliseconds before it goes away. null: stays until dismissed. Default: 4 s, 8 s for errors. */
  timeoutMs?: number | null;
}

export interface Notifications {
  /** Shows a notification and returns its id. */
  notify(message: string, options?: NotifyOptions): number;
  dismiss(id: number): void;
  /** Current notifications, oldest first. */
  list(): readonly Notification[];
  subscribe(listener: () => void): () => void;
}

const DEFAULT_TIMEOUT: Record<NotificationLevel, number> = { info: 4000, success: 4000, warning: 6000, error: 8000 };

/** `max`: how many are kept at once; the oldest goes first. */
export function createNotifications({ max = 4 }: { max?: number } = {}): Notifications {
  let items: readonly Notification[] = [];
  let nextId = 1;
  const timers = new Map<number, NodeJS.Timeout>();
  const listeners = new Set<() => void>();
  const changed = () => {
    for (const l of listeners) l();
  };

  const dismiss = (id: number) => {
    clearTimeout(timers.get(id));
    timers.delete(id);
    if (!items.some((n) => n.id === id)) return;
    items = items.filter((n) => n.id !== id);
    changed();
  };

  return {
    notify(message, { level = "info", title, timeoutMs } = {}) {
      const id = nextId++;
      items = [...items, { id, level, title, message }];
      while (items.length > max) dismiss(items[0]!.id);
      const timeout = timeoutMs === undefined ? DEFAULT_TIMEOUT[level] : timeoutMs;
      // unref: a pending toast never keeps the process alive.
      if (timeout !== null) timers.set(id, setTimeout(() => dismiss(id), timeout).unref());
      changed();
      return id;
    },
    dismiss,
    list: () => items,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
