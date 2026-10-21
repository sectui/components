import assert from "node:assert/strict";
import { test } from "node:test";
import { nearestInDirection, type Rect } from "./navigation.ts";

//  ┌list──┐┌request─┐
//  │      │├response┤
//  └──────┘└────────┘
const list: Rect = { x: 0, y: 0, width: 20, height: 20 };
const request: Rect = { x: 20, y: 0, width: 40, height: 10 };
const response: Rect = { x: 20, y: 10, width: 40, height: 10 };
const all = [list, request, response];

test("right from the list goes to the closest aligned pane", () => {
  assert.equal(nearestInDirection(list, all, "right"), 1); // request and response are equally far; request first
});

test("down from request is response, up goes back", () => {
  assert.equal(nearestInDirection(request, all, "down"), 2);
  assert.equal(nearestInDirection(response, all, "up"), 1);
});

test("left from either right pane is the list", () => {
  assert.equal(nearestInDirection(request, all, "left"), 0);
  assert.equal(nearestInDirection(response, all, "left"), 0);
});

test("nothing in that direction gives -1", () => {
  assert.equal(nearestInDirection(list, all, "left"), -1);
  assert.equal(nearestInDirection(request, all, "up"), -1);
});
