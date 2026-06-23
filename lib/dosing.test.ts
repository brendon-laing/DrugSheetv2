import { describe, it, expect } from "vitest";
import { computeDose, calcDrug, effConc, drugKey, fmt, kgToLb } from "./dosing";
import { SECTIONS } from "./formulary";
import { rxClavamox, rxGabapentin, meloxicamOral } from "./rx";
import { minutesBetween, clockPlus, totalLabel } from "./time";
import { calcFluid } from "./fluids";
import { gridMinuteHeaders, timeRow, defaultChecklist } from "./vitals";
import { normalizeAge, cap, extractPatient } from "./ocr";

const all = SECTIONS.flatMap((s) => s.drugs.map((d) => ({ d, section: s.name })));
const find = (name: string) => all.find((x) => x.d.name === name)!;
const lookupById = (id: string) => {
  for (const s of SECTIONS) for (const d of s.drugs) if (d.id === id) return { drug: d, sectionName: s.name };
  return undefined;
};

describe("computeDose", () => {
  it("computes mg dose and mL volume for a simple mg/mL drug (Propofol, 10 kg)", () => {
    const { d } = find("Propofol"); // conc 10 mg/mL, 2–6 mg/kg
    const r = computeDose(d, 10);
    expect(r.doseLow).toBe(20);
    expect(r.doseHigh).toBe(60);
    expect(r.volLow).toBe(2);
    expect(r.volHigh).toBe(6);
  });

  it("applies volFactor for µg-dosed drugs (Dexmedetomidine, 5 kg)", () => {
    const { d } = find("Dexmedetomidine"); // 5–10 µg/kg, conc 0.5 mg/mL, volFactor 1000
    const r = computeDose(d, 5);
    expect(r.doseLow).toBe(25);
    expect(fmt(r.volLow!)).toBe("0.05");
  });

  it("honours an effective concentration override", () => {
    const { d } = find("Propofol"); // default conc 10 → override to 20 halves the volume
    const r = computeDose(d, 10, 20);
    expect(r.volHigh).toBe(3); // 60 mg / 20 mg/mL
  });

  it("returns nulls for invalid weight", () => {
    const { d } = find("Propofol");
    const r = computeDose(d, 0);
    expect(r.doseLow).toBeNull();
    expect(r.volLow).toBeNull();
  });
});

describe("effConc precedence", () => {
  it("patient override beats global beats default", () => {
    const { d, section } = find("Propofol");
    const key = drugKey(section, d);
    expect(effConc(d, key, { patient: { [key]: 25 }, global: { [key]: 15 } })).toBe(25);
    expect(effConc(d, key, { global: { [key]: 15 } })).toBe(15);
    expect(effConc(d, key, {})).toBe(10); // falls back to drug default
  });
});

describe("calcDrug mirror", () => {
  it("Atipamezole mirrors Dexmedetomidine's volume (5 kg)", () => {
    const dex = calcDrug(find("Dexmedetomidine").d, "Premedication", 5, { lookupById });
    const ati = calcDrug(find("Atipamezole").d, "Emergency", 5, { lookupById });
    expect(ati.mirror).toBe(true);
    expect(ati.volLow).toBe(dex.volLow);
    expect(ati.volHigh).toBe(dex.volHigh);
  });
});

describe("fmt / kgToLb", () => {
  it("rounds to 2 dp", () => expect(fmt(1.2345)).toBe("1.23"));
  it("handles non-finite", () => expect(fmt(Infinity)).toBe("-"));
  it("converts kg→lb", () => expect(kgToLb(10)).toBe(22));
});

describe("discharge Rx", () => {
  it("meloxicam banding picks a chew tablet for a mid-size dog", () => {
    expect(meloxicamOral(12)).toContain("2.5 mg chew");
  });
  it("clavamox lands per-dose mg in 12.5–25 mg/kg (10 kg)", () => {
    const rx = rxClavamox(10); // target 125–250 mg/dose
    const mg = Number(rx.detail.match(/([\d.]+) mg\/dose/)?.[1]);
    expect(mg).toBeGreaterThanOrEqual(125);
    expect(mg).toBeLessThanOrEqual(250);
  });
  it("gabapentin returns a usable sig (10 kg)", () => {
    expect(rxGabapentin(10).sig).toMatch(/PO q8/);
  });
});

describe("time", () => {
  it("minutesBetween wraps past midnight", () => {
    expect(minutesBetween("09:00", "10:30")).toBe(90);
    expect(minutesBetween("23:30", "00:15")).toBe(45);
    expect(minutesBetween("", "10:00")).toBe("");
  });
  it("clockPlus wraps the 24h clock", () => {
    expect(clockPlus("09:00", 50)).toBe("09:50");
    expect(clockPlus("23:50", 20)).toBe("00:10");
  });
  it("totalLabel formats", () => expect(totalLabel("09:00", "09:45")).toBe("45 min"));
});

describe("fluids", () => {
  it("surgical rate range (Isolyte, 10 kg)", () => {
    const r = calcFluid(SECTIONS[0] ? { name: "Surgical Rate", fluid: "Isolyte", route: "IV", low: 3, high: 5, doseU: "mL/kg/hr", type: "rate" } : (null as never), 10);
    expect(r.volume).toContain("mL/hr");
  });
  it("postop allometric pump rate is positive (10 kg)", () => {
    const r = calcFluid({ name: "Post-op Rate", fluid: "Isolyte", route: "IV", type: "postop" }, 10);
    expect(r.volume).toMatch(/[\d.]+ mL\/hr/);
  });
});

describe("vitals grid", () => {
  it("minute headers are 0..50 step 5", () => {
    expect(gridMinuteHeaders(0)).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50]);
    expect(gridMinuteHeaders(1)[0]).toBe(50);
  });
  it("time row fills from a start time", () => {
    expect(timeRow("09:00", [0, 5, 10])).toEqual(["09:00", "09:05", "09:10"]);
    expect(timeRow("", [0, 5])).toEqual(["", ""]);
  });
  it("default checklist has the expected first item", () => {
    expect(defaultChecklist()[0]).toEqual({ label: "Narcotic Log", done: false });
  });
});

describe("ocr helpers", () => {
  it("normalizeAge spaces out tokens", () => {
    expect(normalizeAge("10monthsold")).toBe("10 months old");
  });
  it("cap title-cases a word", () => expect(cap("LABRADOR")).toBe("Labrador"));
  it("extractPatient pulls weight + phone", () => {
    const e = extractPatient("Species: Canine\nWeight 12.5 kg\n(415) 555-0172");
    expect(e.weightKg).toBe(12.5);
    expect(e.phone).toContain("555-0172");
    expect(e.species).toBe("Canine");
  });
});
