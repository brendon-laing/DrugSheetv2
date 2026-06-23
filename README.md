# Novel Charts

Multi-clinic anaesthetic & surgical charting for veterinary practices. Next.js + Supabase, deployed on Vercel. Rebuild of the original standalone `anesthetic-dosing-sheet.html` tool.

See [`../ARCHITECTURE.md`](../ARCHITECTURE.md) for the full design and roadmap.

## What's in this Phase 0 scaffold

Pure, unit-tested clinical logic (no DOM coupling — ported from the original):
- **`lib/formulary.ts`** — Novel drug list + fluids, typed (moves to the DB in Phase 2).
- **`lib/dosing.ts`** — dose/volume calc incl. `volFactor`, editable-concentration overrides (`effConc`), and mirror drugs (`calcDrug`).
- **`lib/rx.ts`** — discharge Rx generators (Meloxicam banding, Clavamox/Gabapentin tablet-picking).
- **`lib/time.ts`** — `minutesBetween` (overnight-safe) + `clockPlus` for time totals and 5-min stepping.
- **`lib/fluids.ts`** — surgical rate / shock bolus / allometric post-op pump + drip rates.
- **`lib/vitals.ts`** — vitals-grid rows, minute headers, time row, checklist defaults, trend points.
- **`lib/ocr.ts`** — OCR text normalisation + patient-field extraction (image step runs client-side).
- **`lib/chart.ts`** — chart serialize types matching the `charts` jsonb columns.
- **`lib/dosing.test.ts`** — Vitest suite (24 assertions across all modules).

App + infra:
- **`app/page.tsx`** — working dosing page proving the logic renders with the Novel palette.
- **`app/api/vetspire/patient/route.ts`** — server-side Vetspire proxy (token never reaches the browser; Node runtime).
- **`lib/supabase/{client,server}.ts`** + **`middleware.ts`** — RLS-scoped clients, service-role client, and session refresh.
- **`supabase/migrations/0001_init.sql`** — multi-tenant schema with Row-Level Security.

See **`REVIEW.md`** for the senior-engineering audit (bugs found/fixed + full feature-parity matrix).

## Run locally

```bash
npm install
npm run test        # run the dose-logic tests
npm run dev         # http://localhost:3000
```

The demo dosing page works without any backend. Auth + persistence land in Phase 1.

## Deploy

### 1. Supabase
1. Create a project at supabase.com.
2. In the SQL editor, run `supabase/migrations/0001_init.sql`.
3. Copy the project URL, anon key, and service-role key from **Settings → API**.

### 2. GitHub
```bash
git init && git add . && git commit -m "Phase 0: scaffold"
git branch -M main
git remote add origin https://github.com/<you>/novel-charts.git
git push -u origin main
```

### 3. Vercel
1. Import the GitHub repo at vercel.com.
2. Add env vars from `.env.example` (URL, anon key, service-role key, Vetspire URL).
3. Deploy. Every PR gets a preview URL; merges to `main` ship production.

## Security notes

- The Supabase **service-role key** and each clinic's **Vetspire token** are server-only. The Vetspire token is stored per-clinic in the DB (encrypt before production) and read only by `app/api/vetspire/*`.
- Multi-tenant isolation is enforced in Postgres via RLS — see the policies in the migration.

## Roadmap (summary)

0. **Scaffold** (this) → 1. **Auth + single-clinic parity** → 2. **Per-clinic formulary admin** → 3. **Vetspire integration** → 4. **Multi-clinic hardening** (invites, roles, audit) → 5. *(optional)* **Stripe billing + self-serve signup**.
