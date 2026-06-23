// Fluid-rate calculations — ported from the original tool's updateFluids().
import { fmt } from "./dosing";
import type { FluidLine } from "./formulary";

export interface FluidResult {
  dosage: string; // left column text
  volume: string; // right column text
}

/**
 * Compute a fluid line's display strings for a given weight.
 * - rate:  surgical maintenance range (mL and mL/hr)
 * - bolus: shock bolus range, and the amount to give in 15 min (¼ of the bolus)
 * - postop: allometric maintenance — 1.5 × 70 × kg^0.75 / 24 mL/hr, plus macro/micro
 *           drip rates (10 gtt/mL and 60 gtt/mL drip sets) in seconds per drip.
 */
export function calcFluid(f: FluidLine, weightKg: number): FluidResult {
  const w = Number(weightKg);
  const valid = isFinite(w) && w > 0;
  if (!valid) return { dosage: "—", volume: "—" };

  if (f.type === "rate") {
    return {
      dosage: `${fmt(w * (f.low ?? 0))} – ${fmt(w * (f.high ?? 0))} mL`,
      volume: `${fmt(w * (f.low ?? 0))} – ${fmt(w * (f.high ?? 0))} mL/hr`,
    };
  }
  if (f.type === "bolus") {
    return {
      dosage: `${fmt(w * (f.low ?? 0))} – ${fmt(w * (f.high ?? 0))} mL`,
      volume: `${fmt((w * (f.low ?? 0)) / 4)} – ${fmt((w * (f.high ?? 0)) / 4)} mL in 15 min`,
    };
  }
  // postop (allometric)
  const pump = (1.5 * 70 * Math.pow(w, 0.75)) / 24; // mL/hr
  const macro = 3600 / (pump * 10); // sec/drip, 10 gtt/mL
  const micro = 3600 / (pump * 60); // sec/drip, 60 gtt/mL
  return {
    dosage: `Macro ${fmt(macro)} s/drip · Micro ${fmt(micro)} s/drip`,
    volume: `${fmt(pump)} mL/hr (pump)`,
  };
}
