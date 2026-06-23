// Formulary data model — ported verbatim from the standalone HTML tool's SECTIONS/FLUIDS.
// In Phase 2 this seed data moves into the `formulary_drugs` table (editable per clinic);
// the types below match both the in-code seed and the DB rows.

export type RxKind = "meloxicam" | "clavamox" | "gabapentin";

export interface Drug {
  id?: string;
  name: string;
  conc?: number;        // concentration value
  concU?: string;       // concentration unit, e.g. "mg/mL"
  route?: string;       // e.g. "IM, IV"
  low?: number;         // low end of dose range
  high?: number;        // high end of dose range
  doseU?: string;       // dose unit, e.g. "mg/kg" or "µg/kg"
  dsgU?: string;        // dosage display unit, e.g. "mg" or "µg"
  volFactor?: number;   // unit-conversion factor for volume (e.g. dexmedetomidine µg→mg = 1000)
  log?: boolean;        // controlled drug requiring a log entry (🪵)
  mirror?: string;      // volume mirrors another drug's volume (by id), e.g. atipamezole ↔ dexmed
  form?: string;        // dispensed form text (discharge meds)
  special?: "rx";       // uses a discharge prescription generator
  rxKind?: RxKind;      // which generator to use
}

export interface Section {
  name: string;
  color: string;        // CSS variable name from the Novel palette
  drugs: Drug[];
}

export interface FluidLine {
  name: string;
  fluid: string;
  route: string;
  low?: number;
  high?: number;
  doseU?: string;
  type: "rate" | "bolus" | "postop";
}

export const SECTIONS: Section[] = [
  {
    name: "Premedication",
    color: "var(--park)",
    drugs: [
      { id: "atropine_pre", name: "Atropine", conc: 0.5, concU: "mg/mL", route: "IM, IV", low: 0.02, high: 0.04, doseU: "mg/kg", dsgU: "mg" },
      { name: "Acepromazine", conc: 10, concU: "mg/mL", route: "IM, IV", low: 0.02, high: 0.1, doseU: "mg/kg", dsgU: "mg" },
      { name: "Fentanyl", conc: 50, concU: "µg/mL", route: "IV", low: 2, high: 6, doseU: "µg/kg", dsgU: "µg" },
      { name: "Butorphanol", conc: 10, concU: "mg/mL", route: "IM, IV", low: 0.2, high: 0.4, doseU: "mg/kg", dsgU: "mg", log: true },
      { name: "Buprenorphine", conc: 0.3, concU: "mg/mL", route: "IM, IV", low: 0.006, high: 0.02, doseU: "mg/kg", dsgU: "mg", log: true },
      { name: "Methadone", conc: 10, concU: "mg/mL", route: "IM, IV", low: 0.2, high: 0.3, doseU: "mg/kg", dsgU: "mg", log: true },
      { name: "Hydromorphone", conc: 2, concU: "mg/mL", route: "IM, IV", low: 0.05, high: 0.1, doseU: "mg/kg", dsgU: "mg", log: true },
      { id: "dexmed", name: "Dexmedetomidine", conc: 0.5, concU: "mg/mL", route: "IM, IV", low: 5, high: 10, doseU: "µg/kg", dsgU: "µg", volFactor: 1000 },
      { name: "Midazolam", conc: 5, concU: "mg/mL", route: "IM, IV", low: 0.2, high: 0.5, doseU: "mg/kg", dsgU: "mg", log: true },
      { name: "Ketamine", conc: 100, concU: "mg/mL", route: "", low: 2, high: 10, doseU: "mg/kg", dsgU: "mg", log: true },
    ],
  },
  {
    name: "Induction",
    color: "var(--midnight)",
    drugs: [
      { name: "Propofol", conc: 10, concU: "mg/mL", route: "IV", low: 2, high: 6, doseU: "mg/kg", dsgU: "mg" },
      { name: "Alfaxalone", conc: 10, concU: "mg/mL", route: "IV", low: 2, high: 5, doseU: "mg/kg", dsgU: "mg" },
    ],
  },
  {
    name: "Analgesia",
    color: "var(--fig)",
    drugs: [
      { name: "Meloxicam (injection)", conc: 5, concU: "mg/mL", route: "SQ, IM, IV", low: 0.1, high: 0.2, doseU: "mg/kg", dsgU: "mg" },
      { name: "Bupivicaine (local)", conc: 5, concU: "mg/mL", route: "SQ", low: 1, high: 2, doseU: "mg/kg", dsgU: "mg" },
      { name: "Lidocaine (local)", conc: 20, concU: "mg/mL", route: "SQ", low: 1, high: 4, doseU: "mg/kg", dsgU: "mg" },
    ],
  },
  {
    name: "Antibiotic",
    color: "var(--accent-ink)",
    drugs: [
      { name: "Ampicillin", conc: 100, concU: "mg/mL", route: "IM, IV", low: 20, high: 40, doseU: "mg/kg", dsgU: "mg" },
      { name: "Cefazolin", conc: 100, concU: "mg/mL", route: "IV", high: 22, doseU: "mg/kg", dsgU: "mg" },
    ],
  },
  {
    name: "Discharge Medication",
    color: "var(--accent)",
    drugs: [
      { name: "Meloxicam (oral)", route: "PO", high: 0.05, doseU: "mg/kg", dsgU: "mg", form: "1.5 mg/mL susp · 2.5 mg chew", special: "rx", rxKind: "meloxicam" },
      { name: "Clavamox", route: "PO", low: 12.5, high: 25, doseU: "mg/kg", dsgU: "mg", form: "62.5 / 125 / 250 / 375 / 500 mg tab", special: "rx", rxKind: "clavamox" },
      { name: "Gabapentin", route: "PO", low: 10, high: 30, doseU: "mg/kg", dsgU: "mg", form: "100 mg/mL liquid · 100 / 300 / 600 mg cap", special: "rx", rxKind: "gabapentin" },
    ],
  },
  {
    name: "Emergency",
    color: "var(--red-sky)",
    drugs: [
      { name: "Atropine", conc: 0.5, concU: "mg/mL", route: "IV", high: 0.05, doseU: "mg/kg", dsgU: "mg" },
      { name: "Glycopyrollate", conc: 0.2, concU: "mg/mL", route: "IV", low: 0.005, high: 0.01, doseU: "mg/kg", dsgU: "mg" },
      { name: "Atipamezole", route: "IM", mirror: "dexmed", dsgU: "mg" },
      { name: "Glycopyrrolate", conc: 1.0, concU: "mg/mL", route: "IV", low: 0.005, high: 0.01, doseU: "mg/kg", dsgU: "mg" },
      { name: "Lidocaine", conc: 20, concU: "mg/mL", route: "IV", high: 2, doseU: "mg/kg", dsgU: "mg" },
      { name: "Epinephrine", conc: 1.0, concU: "mg/mL", route: "IV slowly", low: 0.01, high: 0.1, doseU: "mg/kg", dsgU: "mg" },
      { name: "Naloxone", conc: 1.0, concU: "mg/mL", route: "SQ, IM, IV", low: 0.02, high: 0.04, doseU: "mg/kg", dsgU: "mg" },
    ],
  },
];

export const FLUIDS: FluidLine[] = [
  { name: "Surgical Rate", fluid: "Isolyte", route: "IV", low: 3, high: 5, doseU: "mL/kg/hr", type: "rate" },
  { name: "Bolus", fluid: "Isolyte", route: "IV", low: 45, high: 90, doseU: "mL/kg", type: "bolus" },
  { name: "Post-op Rate", fluid: "Isolyte", route: "IV", type: "postop" },
];

export const FLUID_COLOR = "var(--midnight)";
