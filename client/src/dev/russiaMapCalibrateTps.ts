export type ControlPoint = { lat: number; lon: number; x: number; y: number };

function thinPlateU(r: number): number {
  if (r < 1e-12) return 0;
  return r * r * Math.log(r);
}

/** Solve A x = b (Gaussian elimination with partial pivoting). */
function solveLinearSystem(aIn: number[][], bIn: number[]): number[] | null {
  const n = bIn.length;
  const a = aIn.map((row, i) => [...row, bIn[i]!]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(a[r]![col]!) > Math.abs(a[pivot]![col]!)) pivot = r;
    }
    if (Math.abs(a[pivot]![col]!) < 1e-14) return null;
    if (pivot !== col) {
      const tmp = a[col]!;
      a[col] = a[pivot]!;
      a[pivot] = tmp;
    }
    const diag = a[col]![col]!;
    for (let c = col; c <= n; c++) a[col]![c]! /= diag;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = a[r]![col]!;
      if (factor === 0) continue;
      for (let c = col; c <= n; c++) a[r]![c]! -= factor * a[col]![c]!;
    }
  }
  return a.map((row) => row[n]!);
}

/**
 * Thin-plate spline fit: lat/lon → SVG x,y.
 * Returns weights [w0..wn-1, a0, aLon, aLat] for x and y, or null if singular.
 */
export function fitThinPlateSpline(
  controls: ControlPoint[],
): { wx: number[]; wy: number[] } | null {
  const n = controls.length;
  if (n < 3) return null;

  const size = n + 3;
  const k: number[][] = Array.from({ length: size }, () => Array(size).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const ci = controls[i]!;
      const cj = controls[j]!;
      k[i]![j] = thinPlateU(Math.hypot(ci.lon - cj.lon, ci.lat - cj.lat));
    }
    k[i]![n] = 1;
    k[i]![n + 1] = controls[i]!.lon;
    k[i]![n + 2] = controls[i]!.lat;
    k[n]![i] = 1;
    k[n + 1]![i] = controls[i]!.lon;
    k[n + 2]![i] = controls[i]!.lat;
  }

  const bx = [...controls.map((c) => c.x), 0, 0, 0];
  const by = [...controls.map((c) => c.y), 0, 0, 0];
  const wx = solveLinearSystem(k, bx);
  const wy = solveLinearSystem(k, by);
  if (!wx || !wy) return null;
  return { wx, wy };
}

export function projectWithTps(
  lat: number,
  lon: number,
  controls: ControlPoint[],
  wx: number[],
  wy: number[],
): { x: number; y: number } {
  const n = controls.length;
  let x = wx[n]! + wx[n + 1]! * lon + wx[n + 2]! * lat;
  let y = wy[n]! + wy[n + 1]! * lon + wy[n + 2]! * lat;
  for (let i = 0; i < n; i++) {
    const c = controls[i]!;
    const u = thinPlateU(Math.hypot(lon - c.lon, lat - c.lat));
    x += wx[i]! * u;
    y += wy[i]! * u;
  }
  return { x, y };
}

export function formatTsNumber(n: number): string {
  const rounded = Math.round(n * 1e12) / 1e12;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}
