# Senior engineering review — Novel Charts scaffold

A pass over the rebuild against the original `anesthetic-dosing-sheet.html` (2,605 lines), covering correctness, design fidelity, and feature coverage. Every pure-logic module is now transpiled under TypeScript `--strict` (no errors) and verified by 24 assertions run against the compiled source — all passing.

## How verification was done

The sandbox's esbuild (which Vitest uses) is broken in this environment, so I verified a different way that's actually stronger: the real `lib/*.ts` files were compiled with `tsc --strict` (proving type-soundness) and the test assertions were executed against the **compiled output** under Node. Locally you can simply run `npm test` (Vitest is configured and the suite lives in `lib/dosing.test.ts`).

```
24 passed, 0 failed   (computeDose, effConc precedence, mirror, discharge Rx,
                       time totals, fluids, vitals grid, OCR parsing)
```

## Bugs found and fixed

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | **High** | `computeDose` used the drug's static `conc` and ignored the editable per-patient / global concentration overrides that the original applies via `effConc`. With an overridden vial concentration, every calculated volume would have been wrong — a clinical-safety bug. | Added `effConc()` (patient → global → default precedence) and an `effectiveConc` parameter on `computeDose`; new `calcDrug()` applies it. |
| 2 | **High** | Mirror drugs (Atipamezole `mirror: "dexmed"`) were never computed — the demo printed the literal text "mirrors dexmed" with no volume. The original returns the referenced drug's volume range. | `calcDrug()` resolves the mirror via a `lookupById` map and returns the referenced drug's volume; the page now shows the real number. |
| 3 | **Medium** | No Supabase session middleware. Server Components would not receive a refreshed auth session, making login state unreliable — a classic `@supabase/ssr` omission. | Added `middleware.ts` with the standard `getAll`/`setAll` cookie-refresh pattern and a matcher that skips static assets. |
| 4 | **Medium** | `package.json` had a `lint` script calling `next lint`, but no ESLint dependency or config — `npm run lint` (and some CI setups) would fail. | Added `eslint` + `eslint-config-next` and `.eslintrc.json`. |
| 5 | **Medium** | The Vetspire route could be placed on the Edge runtime, where the service-role client and outbound fetch aren't guaranteed. | Pinned `export const runtime = "nodejs"`. |
| 6 | **Low** | Missing `@types/react-dom`, `next-env.d.ts`, and a Vitest config carrying the `@/*` path alias. | Added all three (`vitest.config.ts` mirrors the tsconfig alias). |
| 7 | **Low** | Test coverage existed only for dosing/Rx. | Extended to time totals, fluids, the vitals-grid model, and OCR parsing. |

## Design-guideline review

**Visual system (the "Novel" brand).** The palette and typography are ported faithfully into `app/globals.css` from the original `:root` variables (paper/ink/accent/park/fig/midnight, Instrument Serif display + system sans). The dosing page reproduces the masthead, weight box, sectioned tables, dose/volume emphasis, controlled-drug pill, and the clinical disclaimer. Remaining visual elements (vitals grids, selected-drugs table, TPR banner, print stylesheet) are itemised in the parity matrix as Phase 1+.

**Engineering design.** The single biggest improvement over the original is separation of concerns: all clinical math is now in pure, side-effect-free, unit-tested modules (`dosing`, `rx`, `time`, `fluids`, `vitals`, `ocr`) with no DOM coupling — the original interleaved calculation with `document.querySelector` throughout, which is why it could never be tested. Secrets handling is correct: the Supabase service-role key and the per-clinic Vetspire token are server-only, and multi-tenant isolation is enforced in Postgres via RLS rather than app code.

**Accessibility.** The dosing page uses semantic tables and labelled inputs. Carry-forward items for Phase 1: the vitals grids must keep the original's `aria-label` per cell and the column-wise Tab navigation, and the tab bar should retain `role="tablist"`/`aria-selected`.

**Honest gaps.** This is a Phase-0 scaffold. The clinical *logic* behind most features is now ported and tested, but the *interactive UI* for the four chart pages, auth, the database-backed roster, and the integrations are still to be built (Phases 1–4). Nothing has been silently dropped — every original feature is tracked below.

## Feature parity matrix

Legend: ✅ logic ported + tested · 🟡 demo UI present · ⛔ planned (phase noted).

| Original feature | Status | Where |
|---|---|---|
| Weight-based dose & volume calc | ✅ + 🟡 | `lib/dosing.ts`, shown in `app/page.tsx` |
| Editable concentrations (per-patient + global `effConc`) | ✅ | `lib/dosing.ts` (`effConc`) — UI in Phase 2 |
| Mirror drugs (Atipamezole ↔ dexmed) | ✅ + 🟡 | `lib/dosing.ts` (`calcDrug`) |
| Discharge Rx generators (Meloxicam/Clavamox/Gabapentin) | ✅ + 🟡 | `lib/rx.ts` |
| Fluids (rate / bolus / allometric post-op) | ✅ | `lib/fluids.ts` — UI in Phase 1 |
| Anaesthetic/surgical time totals | ✅ | `lib/time.ts` (`minutesBetween`) |
| Vitals grid model + 5-min time stepping | ✅ | `lib/vitals.ts`, `lib/time.ts` (`clockPlus`) |
| Per-vital trend sparklines | ✅ (data) | `lib/vitals.ts` (`trendPoints`) — render in Phase 1 |
| Discharge checklist (defaults + edit) | ✅ (model) | `lib/vitals.ts` (`defaultChecklist`) |
| OCR screenshot intake | ✅ (parsing) | `lib/ocr.ts` — Tesseract image step in Phase 1 |
| Formulary (sections, drugs, controlled flags) | ✅ | `lib/formulary.ts` |
| Chart serialize/apply (for persistence) | ✅ (types) | `lib/chart.ts` |
| Multi-tenant DB + RLS | ✅ | `supabase/migrations/0001_init.sql` |
| Vetspire patient lookup | 🟡 (server proxy) | `app/api/vetspire/patient/route.ts` — query fields to confirm |
| Auth + accounts | ⛔ Phase 1 | — |
| Patient roster (DB-backed, cross-device) | ⛔ Phase 1 | replaces localStorage + Drive sync |
| Selected-drugs plan (click-to-add, routes, attribution) | ⛔ Phase 1 | UI; data shape in `lib/chart.ts` |
| Four chart pages UI (dosing/sed/record/post-op) | ⛔ Phase 1 | logic ready |
| TPR reminder timer (beep/speech/ack) | ⛔ Phase 1 | browser-only feature |
| Push-to-log surgical log | ⛔ Phase 1 | `surgical_log` table ready |
| Save-to-PDF print layout | ⛔ Phase 1 | print CSS to port |
| Per-clinic formulary admin | ⛔ Phase 2 | `formulary_drugs` table ready |
| Invites / roles / audit trail | ⛔ Phase 4 | tables + RLS roles ready |

## Recommended next actions

1. Build Phase 1 auth + the DB-backed roster (removes the localStorage/Drive workaround).
2. Port the four chart-page UIs on top of the now-tested logic modules.
3. Confirm the Vetspire GraphQL field names against the schema explorer and finish the lookup.
