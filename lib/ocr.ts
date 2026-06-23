// OCR text normalisation + field extraction — ported from the original tool.
// The image→text step (Tesseract.js) runs in the browser; these pure helpers parse the
// recognised text into patient fields and are unit-testable on their own.

/** Capitalise first letter, lowercase the rest. */
export function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
}

/** "10monthsold" → "10 months old", "2years4months old" → "2 years 4 months old". */
export function normalizeAge(s: string): string {
  return s
    .replace(/(\d)([a-z])/gi, "$1 $2")
    .replace(/([a-z])(\d)/gi, "$1 $2")
    .replace(/(years?|yrs?|months?|mos?|weeks?|days?)(old)\b/gi, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

export interface ExtractedPatient {
  patient?: string;
  species?: string;
  breed?: string;
  colour?: string;
  sex?: string;
  age?: string;
  owner?: string;
  phone?: string;
  weightKg?: number;
}

const labelVal = (text: string, labelRe: RegExp): string | undefined => {
  const m = text.match(labelRe);
  return m ? m[1].trim() : undefined;
};

/**
 * Best-effort extraction of patient fields from OCR'd Vetspire text.
 * Deliberately forgiving: returns only the fields it can confidently read.
 */
export function extractPatient(text: string): ExtractedPatient {
  const out: ExtractedPatient = {};
  const phone = text.match(/\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}/);
  if (phone) out.phone = phone[0];

  const weight = text.match(/(\d+(?:\.\d+)?)\s?kg\b/i);
  if (weight) {
    const w = parseFloat(weight[1]);
    if (isFinite(w) && w > 0 && w < 200) out.weightKg = w;
  }

  out.species = labelVal(text, /species[:\s]+([A-Za-z]+)/i);
  out.breed = labelVal(text, /breed[:\s]+([A-Za-z ]+?)(?:\n|$)/i);
  out.sex = labelVal(text, /sex[:\s]+([A-Za-z/ ]+?)(?:\n|$)/i);
  const age = labelVal(text, /age[:\s]+([\w ]+?)(?:\n|$)/i);
  if (age) out.age = normalizeAge(age);

  return out;
}
