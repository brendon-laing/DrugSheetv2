"use server";
// Server actions — mutations invoked from client components / forms.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getContext } from "@/lib/data";

export async function createPatient(formData: FormData) {
  const ctx = await getContext();
  if (!ctx) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const species = String(formData.get("species") ?? "").trim() || null;
  const breed = String(formData.get("breed") ?? "").trim() || null;
  const weightRaw = String(formData.get("weight_kg") ?? "").trim();
  const weight_kg = weightRaw ? Number(weightRaw) : null;
  if (!name) return;

  const supabase = createServerClient();
  const { data: patient } = await supabase
    .from("patients")
    .insert({ clinic_id: ctx!.clinicId, created_by: ctx!.userId, name, species, breed, weight_kg })
    .select("id")
    .single();

  // create an empty chart row for the patient
  if (patient?.id) {
    await supabase.from("charts").insert({
      patient_id: patient.id,
      clinic_id: ctx!.clinicId,
      fields: weight_kg != null ? { weight: String(weight_kg), "f-patient": name } : { "f-patient": name },
    });
  }
  revalidatePath("/");
  if (patient?.id) redirect(`/patient/${patient.id}`);
}

export async function saveChart(patientId: string, payload: any) {
  const ctx = await getContext();
  if (!ctx) return { error: "unauthenticated" };
  const supabase = createServerClient();

  const { error } = await supabase
    .from("charts")
    .upsert(
      {
        patient_id: patientId,
        clinic_id: ctx.clinicId,
        fields: payload.fields ?? {},
        selections: payload.selections ?? [],
        grids: payload.grids ?? {},
        checklist: payload.checklist ?? [],
        features: payload.features ?? [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "patient_id" }
    );

  // keep the patient row's weight/name in sync for the roster
  if (payload.fields) {
    await supabase
      .from("patients")
      .update({
        name: payload.fields["f-patient"] ?? undefined,
        weight_kg: payload.fields["weight"] ? Number(payload.fields["weight"]) : undefined,
        species: payload.fields["f-species"] ?? undefined,
        breed: payload.fields["f-breed"] ?? undefined,
      })
      .eq("id", patientId);
  }
  revalidatePath(`/patient/${patientId}`);
  return { error: error?.message ?? null };
}

export async function pushToLog(patientId: string, data: any) {
  const ctx = await getContext();
  if (!ctx) return { error: "unauthenticated" };
  const supabase = createServerClient();
  const { error } = await supabase.from("surgical_log").insert({
    clinic_id: ctx.clinicId,
    patient_id: patientId,
    data,
    logged_by: ctx.userId,
  });
  revalidatePath("/log");
  return { error: error?.message ?? null };
}

export async function signOut() {
  const supabase = createServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
