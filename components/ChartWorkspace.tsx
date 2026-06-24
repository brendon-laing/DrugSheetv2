"use client";
// The per-patient chart: Dosing / Sedation / Record / Post-op tabs, backed by Supabase.
import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { SECTIONS } from "@/lib/formulary";
import type { Drug } from "@/lib/formulary";
import { calcDrug, fmt, kgToLb } from "@/lib/dosing";
import { generateRx } from "@/lib/rx";
import { clockPlus } from "@/lib/time";
import { SED_ROWS, REC_ROWS, POSTOP_ROWS, POSTOP_OFFSETS, gridMinuteHeaders, defaultChecklist } from "@/lib/vitals";
import { saveChart, pushToLog } from "@/lib/actions";

const BY_ID = new Map<string, { drug: Drug; sectionName: string }>();
const BY_KEY = new Map<string, { drug: Drug; sectionName: string }>();
for (const s of SECTIONS) for (const d of s.drugs) {
  if (d.id) BY_ID.set(d.id, { drug: d, sectionName: s.name });
  BY_KEY.set(`${s.name}|${d.name}`, { drug: d, sectionName: s.name });
}
const lookupById = (id: string) => BY_ID.get(id);

type Sel = { key: string; end: "lo" | "hi"; volume?: string; time?: string; route?: string; location?: string; drawnBy?: string; verifiedBy?: string; givenBy?: string };
type Fields = Record<string, string>;
type Grids = Record<string, string>;
type Check = { label: string; done: boolean };

const TABS = [
  { id: "dosing", label: "Dosing" },
  { id: "sedation", label: "Sedation monitoring" },
  { id: "record", label: "Anaesthetic & surgical record" },
  { id: "postop", label: "Post-anaesthesia monitoring" },
];

function nowHHMM() {
  const d = new Date();
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

export default function ChartWorkspace({ patient, chart }: { patient: any; chart: any }) {
  const initFields: Fields = (chart?.fields as Fields) ?? { "f-patient": patient?.name ?? "", weight: patient?.weight_kg != null ? String(patient.weight_kg) : "" };
  const [tab, setTab] = useState("dosing");
  const [fields, setFields] = useState<Fields>(initFields);
  const [selections, setSelections] = useState<Sel[]>((chart?.selections as Sel[]) ?? []);
  const [grids, setGrids] = useState<Grids>((chart?.grids as Grids) ?? {});
  const [checklist, setChecklist] = useState<Check[]>(
    (chart?.checklist as Check[])?.length ? (chart.checklist as Check[]) : defaultChecklist()
  );
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const weight = parseFloat(fields["weight"] || "");
  const setField = (k: string, v: string) => setFields((f) => ({ ...f, [k]: v }));
  const setCell = (id: string, v: string) => setGrids((g) => ({ ...g, [id]: v }));

  async function doSave() {
    setSaving(true);
    const res = await saveChart(patient.id, {
      fields,
      selections,
      grids,
      checklist,
      features: TABS.map((t) => t.id),
    });
    setSaving(false);
    if (!res?.error) setSavedAt(new Date().toLocaleTimeString());
  }

  async function doPush() {
    await pushToLog(patient.id, {
      patient: fields["f-patient"],
      weight: fields["weight"],
      procedure: fields["f-proc"],
      date: new Date().toISOString().slice(0, 10),
      selections,
    });
    alert("Pushed to the surgical log.");
  }

  function addSelection(key: string, end: "lo" | "hi") {
    setSelections((s) => [...s, { key, end }]);
  }
  function updateSel(i: number, patch: Partial<Sel>) {
    setSelections((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  }
  function removeSel(i: number) {
    setSelections((s) => s.filter((_, j) => j !== i));
  }

  return (
    <main>
      <div className="masthead" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", borderBottom: "1.5px solid var(--ink)", paddingBottom: 14, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span className="wordmark">Novel</span>
          <span className="eyebrow">{fields["f-patient"] || "Chart"}</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link href="/" className="btn btn-ghost">← Roster</Link>
          <button className="btn btn-ghost" onClick={doPush}>Push to log</button>
          <button className="btn btn-primary" onClick={doSave} disabled={saving}>
            {saving ? "Saving…" : savedAt ? `Saved ${savedAt}` : "Save chart"}
          </button>
        </div>
      </div>

      <div className="tabs" style={{ display: "flex", gap: 6, marginBottom: 18, borderBottom: "1px solid var(--border)" }}>
        {TABS.map((t) => (
          <button key={t.id} className="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            style={{ background: "none", border: "none", borderBottom: tab === t.id ? "2px solid var(--accent)" : "2px solid transparent", color: tab === t.id ? "var(--ink)" : "var(--muted)", fontWeight: 600, fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", padding: "10px 14px", cursor: "pointer" }}>
            {t.label}
          </button>
        ))}
      </div>

      <PatientStrip fields={fields} setField={setField} weight={weight} />

      <SelectedDrugs selections={selections} weight={weight} updateSel={updateSel} removeSel={removeSel} />

      {tab === "dosing" && <DosingTab weight={weight} addSelection={addSelection} />}
      {tab === "sedation" && <MonitorTab prefix="sed" rows={SED_ROWS} startLabel="Sedation start" fields={fields} setField={setField} grids={grids} setCell={setCell} />}
      {tab === "record" && <MonitorTab prefix="rec" rows={REC_ROWS} startLabel="Anaesthesia start" fields={fields} setField={setField} grids={grids} setCell={setCell} />}
      {tab === "postop" && (
        <>
          <PostopTab fields={fields} setField={setField} grids={grids} setCell={setCell} />
          <Checklist checklist={checklist} setChecklist={setChecklist} />
        </>
      )}

      <div className="disclaimer">
        <strong>Clinical decision-support only.</strong> Verify every dose, concentration and route and confirm with the attending DVM before administration.
      </div>
    </main>
  );
}

function PatientStrip({ fields, setField, weight }: { fields: Fields; setField: (k: string, v: string) => void; weight: number }) {
  return (
    <div className="panel">
      <p className="panel-eyebrow">Patient</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
        <Field label="Patient name" id="f-patient" fields={fields} setField={setField} />
        <Field label="Species" id="f-species" fields={fields} setField={setField} />
        <Field label="Breed" id="f-breed" fields={fields} setField={setField} />
        <Field label="Procedure" id="f-proc" fields={fields} setField={setField} />
        <div>
          <label style={lbl}>Weight (kg)</label>
          <input type="number" step="0.01" value={fields["weight"] ?? ""} onChange={(e) => setField("weight", e.target.value)} style={{ ...inp, fontWeight: 600 }} />
          <span style={{ fontSize: 12, color: "var(--muted)" }}>{weight > 0 ? `${kgToLb(weight)} lb` : ""}</span>
        </div>
      </div>
    </div>
  );
}

function Field({ label, id, fields, setField }: { label: string; id: string; fields: Fields; setField: (k: string, v: string) => void }) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      <input value={fields[id] ?? ""} onChange={(e) => setField(id, e.target.value)} style={inp} />
    </div>
  );
}

function DosingTab({ weight, addSelection }: { weight: number; addSelection: (key: string, end: "lo" | "hi") => void }) {
  return (
    <div>
      <p className="panel-eyebrow" style={{ marginTop: 18 }}>Drug dosing — click a volume to add it to the plan above</p>
      {SECTIONS.map((section) => (
        <table key={section.name} style={{ marginBottom: 16 }}>
          <thead>
            <tr><th style={{ width: "24%" }}>Drug</th><th>Conc.</th><th>Route</th><th>Range</th><th>Dose</th><th>Volume mL</th></tr>
          </thead>
          <tbody>
            <tr className="section-row"><td colSpan={6}><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: section.color, marginRight: 8 }} />{section.name}</td></tr>
            {section.drugs.map((drug, i) => {
              const key = `${section.name}|${drug.name}`;
              if (drug.special === "rx") {
                const rx = generateRx(drug.rxKind ?? "", weight);
                return (
                  <tr key={key + i}>
                    <td className="drug">{drug.name}{drug.log && <span className="log-pill">🪵</span>}</td>
                    <td className="muted">{drug.form ?? "—"}</td>
                    <td className="muted">{drug.route}</td>
                    <td className="muted">{drug.low != null ? `${drug.low}–` : ""}{drug.high} {drug.doseU}</td>
                    <td colSpan={2} style={{ color: "var(--park)", fontWeight: 600 }}><strong>{rx.strength}</strong> — {rx.sig}</td>
                  </tr>
                );
              }
              const r = calcDrug(drug, section.name, weight, { lookupById });
              const chip = (end: "lo" | "hi", label: string) => (
                <span onClick={() => addSelection(key, end)} className="dosechip" style={{ cursor: "pointer", color: "var(--accent-ink)", fontWeight: 700 }} title={`Add ${drug.name} to plan`}>{label}</span>
              );
              return (
                <tr key={key + i}>
                  <td className="drug">{drug.name}{drug.log && <span className="log-pill">🪵</span>}</td>
                  <td className="muted">{drug.conc ? `${drug.conc} ${drug.concU}` : "—"}</td>
                  <td className="muted">{drug.route || "—"}</td>
                  <td className="muted">{drug.low != null ? `${drug.low}–` : ""}{drug.high} {drug.doseU}</td>
                  <td>{r.doseLow != null ? `${fmt(r.doseLow)}–` : ""}{r.doseHigh != null ? fmt(r.doseHigh) : "—"} {drug.dsgU}</td>
                  <td className="vol">{r.volHigh != null ? (<>{r.volLow != null && chip("lo", fmt(r.volLow))}{r.volLow != null && " – "}{chip("hi", fmt(r.volHigh) + " mL")}</>) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ))}
    </div>
  );
}

function SelectedDrugs({ selections, weight, updateSel, removeSel }: { selections: Sel[]; weight: number; updateSel: (i: number, p: Partial<Sel>) => void; removeSel: (i: number) => void }) {
  return (
    <div className="panel">
      <p className="panel-eyebrow">Selected drugs</p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ minWidth: 820 }}>
          <thead>
            <tr><th>Drug</th><th>Dose</th><th>Volume</th><th>Time</th><th>Route</th><th>Drawn by</th><th>Verified by</th><th>Given by</th><th></th></tr>
          </thead>
          <tbody>
            {selections.length === 0 && <tr><td colSpan={9} className="muted" style={{ textAlign: "center" }}>Click a dose in the Dosing tab to add a drug.</td></tr>}
            {selections.map((s, i) => {
              const ref = BY_KEY.get(s.key);
              if (!ref) return null;
              const r = calcDrug(ref.drug, ref.sectionName, weight, { lookupById });
              const dose = s.end === "lo" ? r.doseLow : r.doseHigh;
              const vol = s.volume ?? (s.end === "lo" ? r.volLow : r.volHigh);
              return (
                <tr key={i}>
                  <td className="drug">{ref.drug.name}</td>
                  <td>{dose != null ? `${fmt(dose)} ${ref.drug.dsgU ?? ""}` : "—"}</td>
                  <td><input value={s.volume ?? (vol != null ? fmt(vol as number) : "")} onChange={(e) => updateSel(i, { volume: e.target.value })} style={{ ...inpSm, width: 70, fontWeight: 700, color: "var(--accent-ink)" }} /></td>
                  <td><TimeInput value={s.time ?? ""} onChange={(v) => updateSel(i, { time: v })} /></td>
                  <td><input value={s.route ?? (ref.drug.route ?? "").split(",")[0]?.trim() ?? ""} onChange={(e) => updateSel(i, { route: e.target.value })} style={{ ...inpSm, width: 64 }} /></td>
                  <td><input value={s.drawnBy ?? ""} onChange={(e) => updateSel(i, { drawnBy: e.target.value })} style={{ ...inpSm, width: 80 }} /></td>
                  <td><input value={s.verifiedBy ?? ""} onChange={(e) => updateSel(i, { verifiedBy: e.target.value })} style={{ ...inpSm, width: 80 }} /></td>
                  <td><input value={s.givenBy ?? ""} onChange={(e) => updateSel(i, { givenBy: e.target.value })} style={{ ...inpSm, width: 80 }} /></td>
                  <td><button onClick={() => removeSel(i)} className="chk-rm" title="Remove">×</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      <input type="time" value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inpSm, width: 92 }} />
      <button type="button" onClick={() => onChange(nowHHMM())} className="btn-chart" style={{ padding: "0 8px", height: 28 }} title="Now">Now</button>
    </span>
  );
}

function MonitorTab({ prefix, rows, startLabel, fields, setField, grids, setCell }: { prefix: string; rows: string[]; startLabel: string; fields: Fields; setField: (k: string, v: string) => void; grids: Grids; setCell: (id: string, v: string) => void }) {
  const startId = `${prefix}-start`;
  const start = fields[startId] ?? "";
  const minutes = gridMinuteHeaders(0);
  return (
    <div>
      <div className="panel">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
          <div>
            <label style={lbl}>{startLabel}</label>
            <TimeInput value={start} onChange={(v) => setField(startId, v)} />
          </div>
        </div>
      </div>
      <VitalsGrid gridId={prefix} rows={rows} columns={minutes} colLabel={(m) => (start ? clockPlus(start, m) : String(m))} grids={grids} setCell={setCell} />
    </div>
  );
}

function PostopTab({ fields, setField, grids, setCell }: { fields: Fields; setField: (k: string, v: string) => void; grids: Grids; setCell: (id: string, v: string) => void }) {
  const start = fields["po-start"] ?? "";
  return (
    <div>
      <div className="panel">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
          <div><label style={lbl}>Recovery start (extubation)</label><TimeInput value={start} onChange={(v) => setField("po-start", v)} /></div>
          <Field label="Total fluids infused" id="po-fluids" fields={fields} setField={setField} />
        </div>
      </div>
      <VitalsGrid gridId="po" rows={POSTOP_ROWS} columns={POSTOP_OFFSETS} colLabel={(m) => (start ? clockPlus(start, m) : `+${m}`)} grids={grids} setCell={setCell} />
    </div>
  );
}

function VitalsGrid({ gridId, rows, columns, colLabel, grids, setCell }: { gridId: string; rows: string[]; columns: number[]; colLabel: (m: number) => string; grids: Grids; setCell: (id: string, v: string) => void }) {
  return (
    <div className="gridwrap" style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 14 }}>
      <table className="mon" style={{ minWidth: 680 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", minWidth: 120 }}>min →</th>
            {columns.map((m, ci) => <th key={ci}>{colLabel(m)}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => {
            const isTime = ri === 0;
            return (
              <tr key={ri} className={isTime ? "timerow" : ""}>
                <th style={{ textAlign: "left" }}>{row}</th>
                {columns.map((_, ci) => {
                  const id = `${gridId}|${ri}|${ci}`;
                  return <td key={ci}><input value={grids[id] ?? ""} onChange={(e) => setCell(id, e.target.value)} maxLength={8} /></td>;
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Checklist({ checklist, setChecklist }: { checklist: Check[]; setChecklist: (c: Check[]) => void }) {
  const toggle = (i: number) => setChecklist(checklist.map((c, j) => (j === i ? { ...c, done: !c.done } : c)));
  const done = checklist.filter((c) => c.done).length;
  return (
    <div className="panel">
      <p className="panel-eyebrow">Discharge checklist — {done} of {checklist.length} complete</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "6px 18px" }}>
        {checklist.map((c, i) => (
          <label key={i} style={{ display: "flex", gap: 9, alignItems: "center", fontSize: 14, cursor: "pointer" }}>
            <input type="checkbox" checked={c.done} onChange={() => toggle(i)} style={{ width: 16, height: 16 }} />
            <span>{c.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

const lbl: CSSProperties = { display: "block", fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--muted)", marginBottom: 4, fontWeight: 600 };
const inp: CSSProperties = { width: "100%", padding: "9px 10px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--paper-1)", font: "inherit" };
const inpSm: CSSProperties = { padding: "5px 7px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--paper-1)", font: "inherit", fontSize: 12.5 };
