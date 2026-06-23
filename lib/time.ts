// Time helpers — ported from the original tool (minutesBetween, clockPlus).

/** Minutes from a→b as "HH:MM" strings; wraps past midnight. "" if either is missing. */
export function minutesBetween(a: string, b: string): number | "" {
  if (!a || !b) return "";
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  let d = bh * 60 + bm - (ah * 60 + am);
  if (d < 0) d += 1440;
  return d;
}

/** Total label like "45 min" (or "" when undefined). */
export function totalLabel(a: string, b: string): string {
  const m = minutesBetween(a, b);
  return m === "" ? "" : `${m} min`;
}

/** "HH:MM" + addMin minutes, wrapping within a 24h clock. */
export function clockPlus(start: string, addMin: number): string {
  const [h, m] = start.split(":").map(Number);
  const t = (((h * 60 + m + addMin) % 1440) + 1440) % 1440;
  return String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0");
}

/** "HH:MM" for a Date/ms (used for post-op time columns). */
export function hhmm(ms: number): string {
  const d = new Date(ms);
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}
