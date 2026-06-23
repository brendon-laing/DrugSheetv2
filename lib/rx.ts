// Discharge prescription generators — ported verbatim from the standalone HTML tool.
// Each returns { strength, sig, detail } so the UI can show strength and Rx separately.

import { fmt } from "./dosing";

export interface Rx {
  strength: string;
  sig: string;
  detail: string;
}

/** Meloxicam oral banded volume logic (matches the original tool's AQ51 banding). */
export function meloxicamOral(w: number): string {
  if (w < 4) return fmt((w * 0.05) / 1.5) + " mL";
  if (w < 7.6) return "HALF (½) 1.0 mg chewable tablet";
  if (w < 11.1) return "ONE (1) 1.0 mg chewable tablet";
  if (w < 13.6) return "HALF (½) 2.5 mg chewable tablet";
  if (w < 16.6) return "ONE AND A HALF (1½) 1.0 mg chewable tablets";
  if (w < 22.1) return "TWO (2) 1.0 mg chewable tablets";
  if (w < 30.1) return "ONE (1) 2.5 mg chewable tablet";
  if (w < 40.1) return "ONE AND A HALF (1½) 2.5 mg chewable tablets";
  if (w < 55.1) return "TWO (2) 2.5 mg chewable tablets";
  return "talk to DVM";
}

/** 0.5→"½", 1→"1", 1.5→"1½", 2→"2" */
export function fmtTab(c: number): string {
  if (c === 0.5) return "½";
  const whole = Math.floor(c);
  const half = c - whole >= 0.5;
  return (whole > 0 ? String(whole) : "") + (half ? "½" : "");
}

interface TabletPick {
  size: number;
  count: number;
  mg: number;
  score: number;
}

/** Best tablet size + count (whole/half units) landing per-dose mg inside [lo,hi]. */
export function pickTablet(lo: number, hi: number, sizes: number[], split: boolean): TabletPick | null {
  const mid = (lo + hi) / 2;
  const steps = split ? [0.5, 1, 1.5, 2, 2.5, 3, 4] : [1, 2, 3, 4];
  let best: TabletPick | null = null;
  sizes.forEach((sz) =>
    steps.forEach((ct) => {
      const mg = sz * ct;
      if (mg < lo || mg > hi) return;
      const pills = Math.ceil(ct);
      // fewest physical tablets → whole over half → nearest mid-dose
      const score = pills * 1000 + (ct % 1 ? 300 : 0) + Math.abs(mg - mid);
      if (!best || score < best.score) best = { size: sz, count: ct, mg, score };
    })
  );
  return best;
}

export function rxMeloxicam(w: number): Rx {
  if (!isFinite(w) || w <= 0)
    return { strength: "—", sig: "Enter a weight to generate the prescription.", detail: "" };
  return {
    strength: "Meloxicam 1.5 mg/mL susp · 2.5 mg chew",
    sig: `Give ${meloxicamOral(w)} PO once daily with food. Do not combine with other NSAIDs/steroids.`,
    detail: "",
  };
}

export function rxClavamox(w: number): Rx {
  if (!isFinite(w) || w <= 0)
    return { strength: "—", sig: "Enter a weight to generate the prescription.", detail: "" };
  const lo = w * 12.5,
    hi = w * 25;
  const t = pickTablet(lo, hi, [62.5, 125, 250, 375, 500], true);
  if (!t)
    return {
      strength: "—",
      sig: `Target ${fmt(lo)}–${fmt(hi)} mg/dose — no single tablet fits; compound or consult DVM.`,
      detail: "",
    };
  return {
    strength: `Clavamox ${t.size} mg tablet`,
    sig: `Give ${fmtTab(t.count)} tablet PO q12h (BID) with food for 7 days`,
    detail: `≈ ${fmt(t.mg / w)} mg/kg · ${fmt(t.mg)} mg/dose`,
  };
}

export function rxGabapentin(w: number): Rx {
  if (!isFinite(w) || w <= 0)
    return { strength: "—", sig: "Enter a weight to generate the prescription.", detail: "" };
  const lo = w * 10,
    hi = w * 30,
    mid = w * 20;
  const t = pickTablet(lo, hi, [100, 300, 600], false);
  if (t)
    return {
      strength: `Gabapentin ${t.size} mg capsule`,
      sig: `Give ${fmtTab(t.count)} capsule PO q8–12h`,
      detail: `≈ ${fmt(t.mg / w)} mg/kg · ${fmt(t.mg)} mg/dose`,
    };
  const vol = mid / 100;
  return {
    strength: "Gabapentin 100 mg/mL oral liquid",
    sig: `Give ${fmt(vol)} mL PO q8–12h`,
    detail: `≈ 20 mg/kg · ${fmt(mid)} mg/dose`,
  };
}

export function generateRx(kind: string, w: number): Rx {
  switch (kind) {
    case "meloxicam":
      return rxMeloxicam(w);
    case "clavamox":
      return rxClavamox(w);
    case "gabapentin":
      return rxGabapentin(w);
    default:
      return { strength: "—", sig: "", detail: "" };
  }
}
