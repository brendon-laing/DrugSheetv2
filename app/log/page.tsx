import Link from "next/link";
import { redirect } from "next/navigation";
import { getContext, listLog } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function LogPage() {
  const ctx = await getContext();
  if (!ctx) redirect("/login");
  const entries = await listLog();

  return (
    <main>
      <div className="masthead" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", borderBottom: "1.5px solid var(--ink)", paddingBottom: 14, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span className="wordmark">Novel</span>
          <span className="eyebrow">Surgical &amp; anaesthetic log</span>
        </div>
        <Link href="/" className="btn btn-ghost">← Roster</Link>
      </div>

      {entries.length === 0 ? (
        <p className="legend" style={{ color: "var(--muted)" }}>No entries yet. Open a chart and use “Push to log”.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Date</th><th>Patient</th><th>Procedure</th><th>Weight</th><th>Logged</th></tr>
          </thead>
          <tbody>
            {entries.map((e: any) => (
              <tr key={e.id}>
                <td>{e.data?.date ?? "—"}</td>
                <td className="drug">{e.data?.patient ?? "—"}</td>
                <td className="muted">{e.data?.procedure ?? "—"}</td>
                <td>{e.data?.weight ? `${e.data.weight} kg` : "—"}</td>
                <td className="muted">{new Date(e.logged_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
