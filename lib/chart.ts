// Chart serialization types — the shape persisted to the `charts` table.
// Mirrors the original tool's serializeCase() / applyCase() payload so the existing
// data model ports directly into Postgres jsonb columns.

export interface SelectedDrug {
  key: string; // section|name
  end: "lo" | "hi";
  volume?: number;
  time?: string;
  route?: string;
  location?: string;
  drawnBy?: string;
  verifiedBy?: string;
  givenBy?: string;
}

export interface ChartPayload {
  /** every input/select/textarea value, keyed by element id (f-patient, weight, …) */
  fields: Record<string, string | boolean>;
  /** the selected-drugs plan */
  selections: SelectedDrug[];
  /** vitals cells, keyed "containerId|row|col" → value */
  grids: Record<string, string>;
  /** extension-block counts per grid */
  ext: { rec: number; sed: number; po: number };
  /** per-patient concentration overrides, keyed by drugKey() */
  conc: Record<string, number | string>;
  /** discharge checklist */
  checklist: { label: string; done: boolean }[];
  /** which chart sections are enabled */
  features: string[];
}

export const emptyChart = (): ChartPayload => ({
  fields: {},
  selections: [],
  grids: {},
  ext: { rec: 0, sed: 0, po: 0 },
  conc: {},
  checklist: [],
  features: ["page-dosing", "page-monitoring", "page-record", "page-postop"],
});

/** Patient display name from a chart payload (mirrors caseName()). */
export function chartName(c: ChartPayload): string {
  const v = c.fields["f-patient"];
  return typeof v === "string" && v ? v : "Unnamed";
}
