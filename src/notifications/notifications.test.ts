import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";
import { test } from "node:test";
import { createNotifications } from "./notifications.ts";

test("notify, list, dismiss", () => {
  const n = createNotifications();
  const a = n.notify("saved", { level: "success", timeoutMs: null });
  const b = n.notify("oops", { level: "error", title: "Editor", timeoutMs: null });
  assert.deepEqual(
    n.list().map((x) => [x.id, x.level, x.title, x.message]),
    [
      [a, "success", undefined, "saved"],
      [b, "error", "Editor", "oops"],
    ],
  );
  n.dismiss(a);
  assert.deepEqual(
    n.list().map((x) => x.id),
    [b],
  );
});

test("listeners are told about every change", () => {
  const n = createNotifications();
  let calls = 0;
  const off = n.subscribe(() => calls++);
  const id = n.notify("x", { timeoutMs: null });
  n.dismiss(id);
  n.dismiss(id); // already gone: no change
  off();
  n.notify("y", { timeoutMs: null });
  assert.equal(calls, 2);
});

test("they go away after their timeout; null stays", async () => {
  const n = createNotifications();
  n.notify("short", { timeoutMs: 20 });
  n.notify("sticky", { timeoutMs: null });
  await sleep(60);
  assert.deepEqual(
    n.list().map((x) => x.message),
    ["sticky"],
  );
});

test("only the newest are kept", () => {
  const n = createNotifications({ max: 2 });
  for (const m of ["a", "b", "c"]) n.notify(m, { timeoutMs: null });
  assert.deepEqual(
    n.list().map((x) => x.message),
    ["b", "c"],
  );
});
