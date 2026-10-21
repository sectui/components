import assert from "node:assert/strict";
import { test } from "node:test";
import { fitTabs } from "./fit-tabs.ts";

// Five tabs of width 10, "..." of width 3.
const w = [10, 10, 10, 10, 10];
const range = (f: ReturnType<typeof fitTabs>) => [f.start, f.end];

test("everything fits: no ellipsis", () => {
  const f = fitTabs(w, 2, 50, 3);
  assert.deepEqual(range(f), [0, 4]);
  assert.equal(f.hiddenLeft || f.hiddenRight, false);
});

test("the active tab and both neighbours come first", () => {
  // 3 tabs (30) + 2 ellipses (6) = 36
  assert.deepEqual(range(fitTabs(w, 2, 36, 3)), [1, 3]);
});

test("with room for only one neighbour, the left one is kept", () => {
  assert.deepEqual(range(fitTabs(w, 2, 26, 3)), [1, 2]);
});

test("at an edge, the other side gets the room", () => {
  const f = fitTabs(w, 0, 33, 3);
  assert.deepEqual(range(f), [0, 2]);
  assert.equal(f.hiddenLeft, false);
  assert.equal(f.hiddenRight, true);
});

test("the active tab is shown even when nothing fits", () => {
  assert.deepEqual(range(fitTabs(w, 3, 1, 3)), [3, 3]);
});

test("an ellipsis that would replace the last hidden tab is not worth it: the tab is shown instead", () => {
  // Showing 0..4 costs 50; 1..4 costs 43. With 50 cells, everything is shown.
  assert.deepEqual(range(fitTabs(w, 4, 50, 3)), [0, 4]);
});
