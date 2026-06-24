// Roster home — auth-gated. Lists the clinic's patients and adds new ones.
import type { CSSProperties } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getContext, listPatients } from "@/lib/data";
import { createPatient, signOut } from "@/lib/actions";
import { kgToLb } from "@/lib/dosing";

export const dynamic = "force-dynamic";

export default async function RosterPage() {
  const ctx = await getContext();
  if (!ctx) redirect("/login");
  const patients = await listPatients();

  return (
    <main>
      <div className="masthead" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", borderBottom: "1.5px solid var(--ink)", paddingBottom: 14, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span className="wordmark">Novel</span>
          <span className="eyebrow">{ctx.clinicName}</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Link href="/log" className="btn btn-ghost">View log</Link>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>{ctx.email}</span>
          <form action={signOut}><button className="btn btn-ghost" type="submit">Sign out</button></form>
        </div>
      </div>

      <h1>Patients</h1>

      <div className="panel">
        <p className="panel-eyebrow">Add a patient</p>
        <form action={createPatient} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr 1fr auto", gap: 10, alignItems: "end" }}>
          <div><label style={lbl}>Name</label><input name="name" required placeholder="Patient name" style={inp} /></div>
          <div><label style={lbl}>Species</label><input name="species" placeholder="Canine" style={inp} /></div>
          <div><label style={lbl}>Breed</label><input name="breed" placeholder="Beagle" style={inp} /></div>
          <div><label style={lbl}>Weight (kg)</label><input name="weight_kg" type="number" step="0.01" placeholder="0.0" style={inp} /></div>
          <button className="btn btn-primary" type="submit">Add &amp; open</button>
        </form>
      </div>

      {patients.length === 0 ? (
        <p className="legend" style={{ color: "var(--muted)" }}>No patients yet. Add one above to start a chart.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Patient</th><th>Species / breed</th><th>Weight</th><th>Updated</th><th></th></tr>
          </thead>
          <tbody>
            {patients.map((p) => (
              <tr key={p.id}>
                <td className="drug">{p.name ?? "Unnamed"}</td>
                <td className="muted">{[p.species, p.breed].filter(Boolean).join(" · ") || "—"}</td>
                <td>{p.weight_kg != null ? `${p.weight_kg} kg · ${kgToLb(p.weight_kg)} lb` : "—"}</td>
                <td className="muted">{new Date(p.updated_at).toLocaleString()}</td>
                <td><Link href={`/patient/${p.id}`} className="btn btn-ghost">Open chart →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

const lbl: CSSProperties = { display: "block", fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--muted)", marginBottom: 4, fontWeight: 600 };
const inp: CSSProperties = { width: "100%", padding: "9px 10px", border: "1px solid var(--border)", borderRadius: 10, background: "var(--paper-1)", font: "inherit" };
