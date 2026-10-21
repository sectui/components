/** What the tab bar shows: tabs start..end (inclusive), "..." on each side that hides some. */
export interface TabsFit {
  start: number;
  end: number;
  hiddenLeft: boolean;
  hiddenRight: boolean;
  width: number;
}

/**
 * Picks the tabs that fit in `available` cells. The active tab is always shown;
 * then its neighbours are added one at a time, left then right, alternating,
 * so the tabs right before and after it are kept first. A hidden run on a side
 * costs `ellipsisWidth` cells.
 */
export function fitTabs(widths: number[], active: number, available: number, ellipsisWidth: number): TabsFit {
  const n = widths.length;
  const cost = (start: number, end: number) => {
    let w = 0;
    for (let i = start; i <= end; i++) w += widths[i]!;
    if (start > 0) w += ellipsisWidth;
    if (end < n - 1) w += ellipsisWidth;
    return w;
  };
  let start = active;
  let end = active;
  for (let left = true, blocked = 0; blocked < 2; left = !left) {
    const [s, e] = left ? [start - 1, end] : [start, end + 1];
    if (s < 0 || e >= n || cost(s, e) > available) {
      blocked++;
      continue;
    }
    [start, end] = [s, e];
    blocked = 0;
  }
  return { start, end, hiddenLeft: start > 0, hiddenRight: end < n - 1, width: cost(start, end) };
}
