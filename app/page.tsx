"use client";
// Phase-0 demo page: proves the ported formulary + dose logic renders end-to-end.
// In Phase 1 this becomes the authenticated chart workspace backed by Supabase.
import { useState } from "react";
import { SECTIONS } from "@/lib/formulary";
import { calcDrug, fmt, kgToLb } from "@/lib/dosing";
import { generateRx } from "@/lib/rx";

// Build an id → drug lookup once, so mirror drugs (e.g. Atipamezole → dexmed) resolve.
const BY_ID = new Map<string, { drug: (typeof SECTIONS)[number]["drugs"][number]; sectionName: string }>();
for (const s of SECTIONS) {
  for (const d of s.drugs) if (d.id) BY_ID.set(d.id, { drug: d, sectionName: s.name });
}
const lookupById = (id: string) => BY_ID.get(id);

export default function DosingPage() {
  const [weight, setWeight] = useState<number>(10);

  return (
    <main>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <span className="wordmark">Novel</span>
        <span className="eyebrow">Anaesthetic &amp; Surgical Chart</span>
      </div>
      <h1>Drug dosing</h1>

      <div className="panel">
        <div className="weightbox">
          <label htmlFor="w" style={{ fontFamily: "var(--font-display)", fontSize: 22 }}>
            Weight
          </label>
          <input
            id="w"
            type="number"
            min={0}
            step={0.01}
            value={Number.isNaN(weight) ? "" : weight}
            onChange={(e) => setWeight(parseFloat(e.target.value))}
          />
          <span className="unit">kg</span>
          <span className="muted">
            {weight > 0 ? `≈ ${kgToLb(weight)} lb` : ""}
          </span>
        </div>
      </div>

      {SECTIONS.map((section) => (
        <table key={section.name} style={{ marginBottom: 18 }}>
          <thead>
            <tr>
              <th style={{ width: "26%" }}>Drug</th>
              <th>Conc.</th>
              <th>Route</th>
              <th>Dose range</th>
              <th>Dose (low–high)</th>
              <th>Volume mL (low–high)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="section-row">
              <td colSpan={6}>
                <span
                  style={{
                    display: "inline-block",
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    background: section.color,
                    marginRight: 8,
                  }}
                />
                {section.name}
              </td>
            </tr>
            {section.drugs.map((drug, i) => {
              if (drug.special === "rx") {
                const rx = generateRx(drug.rxKind ?? "", weight);
                return (
                  <tr key={drug.name + i}>
                    <td className="drug">
                      {drug.name}
                      {drug.log && <span className="log-pill">🪵 LOG</span>}
                    </td>
                    <td className="muted">{drug.form ?? "—"}</td>
                    <td className="muted">{drug.route}</td>
                    <td className="muted">
                      {drug.low ? `${drug.low}–` : ""}
                      {drug.high} {drug.doseU}
                    </td>
                    <td colSpan={2} style={{ color: "var(--park)", fontWeight: 600 }}>
                      <strong>{rx.strength}</strong> — {rx.sig}
                      {rx.detail && <span className="muted"> ({rx.detail})</span>}
                    </td>
                  </tr>
                );
              }
              const r = calcDrug(drug, section.name, weight, { lookupById });
              return (
                <tr key={drug.name + i}>
                  <td className="drug">
                    {drug.name}
                    {drug.log && <span className="log-pill">🪵 LOG</span>}
                  </td>
                  <td className="muted">
                    {drug.conc ? `${drug.conc} ${drug.concU}` : "—"}
                  </td>
                  <td className="muted">{drug.route || "—"}</td>
                  <td className="muted">
                    {drug.low != null ? `${drug.low}–` : ""}
                    {drug.high} {drug.doseU}
                  </td>
                  <td>
                    {r.doseLow != null ? `${fmt(r.doseLow)}–` : ""}
                    {r.doseHigh != null ? fmt(r.doseHigh) : "—"} {drug.dsgU}
                  </td>
                  <td className="vol">
                    {r.volHigh != null
                      ? `${r.volLow != null ? fmt(r.volLow) + "–" : ""}${fmt(r.volHigh)}${
                          drug.mirror ? " (mirrors " + drug.mirror + ")" : ""
                        }`
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ))}

      <div className="disclaimer">
        <strong>Clinical decision-support only.</strong> Calculated values are estimates
        based on the concentrations and dose ranges in the formulary. Verify every dose,
        concentration, and route against current references and confirm with the attending
        DVM before administration. 🪵 = controlled drug requiring a log entry.
      </div>
    </main>
  );
}
