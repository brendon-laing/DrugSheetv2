// Vitals-grid model — ported from the original tool's grid definitions and time-row logic.
import { clockPlus } from "./time";

// Row labels for each chart's vitals grid (order matters; "Time" rows auto-fill).
export const SED_ROWS = [
  "Time", "O₂ (L/min)", "Heart Rate (HR)", "Resp. Rate (RR)", "SpO₂ (%)",
  "MM", "CRT", "BP Systolic", "BP Diastolic", "MAP", "Temp (°C)",
];

export const REC_ROWS = [
  "Time", "O₂ (L/min)", "ISO %", "Heart Rate (HR)", "SpO₂ (%)", "ETCO₂",
  "Resp. Rate (RR)", "CRT", "MM", "BP Systolic", "BP Diastolic", "MAP",
  "Doppler", "Temp (°C)",
];

export const POSTOP_ROWS = [
  "Post-Op Time", "Temp", "Heart Rate (HR)", "Resp. Rate (RR)", "MM", "CRT",
  "Attitude", "Pain", "FAS", "Urine", "Feces", "Appetite", "Fluid Rate",
  "Bair Hugger", "SpO₂",
];

export const CHECKS_DEFAULT = [
  "Narcotic Log", "Vetspire Invoice", "Drugs in Vetspire", "Medication + Labels",
  "Surgical Report (DVM)", "Discharge Sheet", "Post-Op Temp Check", "Post-Op SMS Check",
  "E-Collar / Sx wear", "Book S/R — if needed", "Walk", "Feed",
  "Microchip Implantation", "Microchip Registration", "Microchip in Vetspire",
  "Dental Rad Log", "Upload Anesthetic Chart",
];

export interface ChecklistItem {
  label: string;
  done: boolean;
}
export const defaultChecklist = (): ChecklistItem[] =>
  CHECKS_DEFAULT.map((label) => ({ label, done: false }));

/** Minute headers for a 50-min grid block (0,5,…,50), offset by extension index. */
export function gridMinuteHeaders(blockIndex = 0): number[] {
  const base = blockIndex * 50;
  return Array.from({ length: 11 }, (_, i) => base + i * 5); // 0..50 step 5
}

/** Clock times for the time row, given a start "HH:MM" and minute headers. */
export function timeRow(start: string, minutes: number[]): string[] {
  if (!start) return minutes.map(() => "");
  return minutes.map((m) => clockPlus(start, m));
}

/** Baseline + TPR cadence offsets (minutes) used to seed the post-op time columns. */
export const POSTOP_OFFSETS = [0, 5, 10, 15, 20, 50, 80, 110];

/** Build sparkline points from a row of cell strings; non-numeric cells are skipped. */
export function trendPoints(cells: string[]): { i: number; v: number }[] {
  const pts: { i: number; v: number }[] = [];
  cells.forEach((c, i) => {
    const v = parseFloat(c);
    if (isFinite(v)) pts.push({ i, v });
  });
  return pts;
}
