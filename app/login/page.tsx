"use client";
// Magic-link sign-in. Supabase emails a one-time link; clicking it hits /auth/callback.
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main style={{ maxWidth: 420, margin: "8vh auto 0" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
        <span className="wordmark">Novel</span>
        <span className="eyebrow">Anaesthetic &amp; Surgical Charts</span>
      </div>
      <h1 style={{ fontSize: 28 }}>Sign in</h1>

      {sent ? (
        <div className="panel">
          <p style={{ margin: 0 }}>
            Check <strong>{email}</strong> for a sign-in link. Open it on this device to continue.
          </p>
        </div>
      ) : (
        <form className="panel" onSubmit={send}>
          <label htmlFor="email" style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
            Work email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@clinic.com"
            style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 10, marginBottom: 12 }}
          />
          <button className="btn btn-primary" type="submit" disabled={busy || !email}>
            {busy ? "Sending…" : "Email me a sign-in link"}
          </button>
          {error && <p style={{ color: "var(--red-sky)", fontSize: 13, marginBottom: 0 }}>{error}</p>}
        </form>
      )}
      <p style={{ fontSize: 12, color: "var(--muted)" }}>
        New here? Signing in creates your account and a clinic workspace automatically.
      </p>
    </main>
  );
}
