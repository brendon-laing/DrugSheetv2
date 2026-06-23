// Pure dose/volume calculation — ported from the standalone HTML tool.
// No DOM, no side effects: fully unit-testable.
//
// Mirrors the original `effConc` (per-patient + global concentration overrides) and
// `calcDrug` (incl. mirror drugs like Atipamezole, which take a referenced drug's volume).

import type { Drug } from "./formulary";

/** Round to 2 dp, matching the original tool's `fmt`. Returns "-" for non-finite. */
export function fmt(n: number): string {
  if (!isFinite(n)) return "-";
  return (Math.round(n * 100) / 100).toFixed(2);
}

/** Stable key for a drug within a section, used to look up concentration overrides. */
export function drugKey(sectionName: string, drug: Pick<Drug, "name">): string {
  return `${sectionName}|${drug.name}`;
}

export interface ConcSources {
  /** per-patient concentration overrides, keyed by drugKey() */
  patient?: Record<string, number | string | null | undefined>;
  /** clinic/global default overrides, keyed by drugKey() */
  global?: Record<string, number | string | null | undefined>;
}

const asNum = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return isFinite(n) ? n : null;
};

/**
 * Effective concentration: per-patient override → global override → the drug's default.
 * Returns undefined when no concentration is known (e.g. discharge meds dosed by tablet).
 */
export function effConc(
  drug: Pick<Drug, "conc">,
  key?: string,
  sources?: ConcSources
): number | undefined {
  if (key && sources) {
    const p = asNum(sources.patient?.[key]);
    if (p != null) return p;
    const g = asNum(sources.global?.[key]);
    if (g != null) return g;
  }
  return drug.conc;
}

export interface DoseResult {
  doseLow: number | null; // dose at low end of range (in dsgU)
  doseHigh: number | null; // dose at high end of range (in dsgU)
  volLow: number | null; // injection volume (mL) at low end
  volHigh: number | null; // injection volume (mL) at high end
  mirror?: boolean; // true if volumes were taken from a mirrored drug
}

/**
 * Compute dose (mg or µg) and injection volume (mL) for a drug at a given weight.
 *
 * dose   = weight(kg) × rate(dose/kg)
 * volume = dose / (effectiveConc × volFactor?)
 *
 * `volFactor` reconciles dose units with concentration units (e.g. dexmedetomidine is
 * dosed in µg/kg but its concentration is mg/mL, so volFactor = 1000).
 *
 * Pass `effectiveConc` to honour per-patient / global concentration overrides; when
 * omitted, the drug's own `conc` is used.
 */
export function computeDose(
  drug: Pick<Drug, "low" | "high" | "conc" | "volFactor">,
  weightKg: number,
  effectiveConc?: number
): DoseResult {
  const w = Number(weightKg);
  const valid = isFinite(w) && w > 0;
  const conc = effectiveConc ?? drug.conc;

  const dose = (rate?: number): number | null =>
    rate == null || !valid ? null : w * rate;

  const vol = (d: number | null): number | null => {
    if (d == null || !conc) return null;
    const denom = conc * (drug.volFactor ?? 1);
    if (!denom) return null;
    return d / denom;
  };

  const doseLow = dose(drug.low);
  const doseHigh = dose(drug.high);
  return { doseLow, doseHigh, volLow: vol(doseLow), volHigh: vol(doseHigh) };
}

export interface CalcContext {
  sources?: ConcSources;
  /** resolve a mirrored drug by its id (e.g. "dexmed") to compute its volume range */
  lookupById?: (id: string) => { drug: Drug; sectionName: string } | undefined;
}

/**
 * Full calculation including mirror drugs. Atipamezole (`mirror: "dexmed"`) returns the
 * referenced drug's *volume* range as its own dose/volume — matching the original.
 */
export function calcDrug(
  drug: Drug,
  sectionName: string,
  weightKg: number,
  ctx: CalcContext = {}
): DoseResult {
  if (drug.mirror) {
    const ref = ctx.lookupById?.(drug.mirror);
    if (!ref) return { doseLow: null, doseHigh: null, volLow: null, volHigh: null, mirror: true };
    const r = calcDrug(ref.drug, ref.sectionName, weightKg, ctx);
    // the mirrored drug's *volume* becomes this drug's dose & volume
    return { doseLow: r.volLow, doseHigh: r.volHigh, volLow: r.volLow, volHigh: r.volHigh, mirror: true };
  }
  const key = drugKey(sectionName, drug);
  return computeDose(drug, weightKg, effConc(drug, key, ctx.sources));
}

/** kg → lb, to one decimal (mirrors the weight box's live conversion). */
export function kgToLb(kg: number): number {
  return Math.round(kg * 2.2046226218 * 10) / 10;
}
