export type Direction = "left" | "right" | "up" | "down";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Index of the nearest rect in `direction` from `from`, or -1. A candidate must lie
 * beyond the current edge (borders may overlap by one cell). The score favours
 * the closest one along the axis, then the best aligned on the other axis.
 */
export function nearestInDirection(from: Rect, candidates: Rect[], direction: Direction): number {
  const center = (r: Rect) => ({ cx: r.x + r.width / 2, cy: r.y + r.height / 2 });
  const c0 = center(from);
  let best = -1;
  let bestScore = Infinity;
  candidates.forEach((r, i) => {
    if (r === from) return;
    const c = center(r);
    let gap: number;
    let offAxis: number;
    switch (direction) {
      case "right":
        if (r.x < from.x + from.width - 1) return;
        gap = r.x - (from.x + from.width);
        offAxis = Math.abs(c.cy - c0.cy);
        break;
      case "left":
        if (r.x + r.width > from.x + 1) return;
        gap = from.x - (r.x + r.width);
        offAxis = Math.abs(c.cy - c0.cy);
        break;
      case "down":
        if (r.y < from.y + from.height - 1) return;
        gap = r.y - (from.y + from.height);
        offAxis = Math.abs(c.cx - c0.cx);
        break;
      case "up":
        if (r.y + r.height > from.y + 1) return;
        gap = from.y - (r.y + r.height);
        offAxis = Math.abs(c.cx - c0.cx);
        break;
    }
    const score = Math.max(0, gap) * 2 + offAxis;
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}
