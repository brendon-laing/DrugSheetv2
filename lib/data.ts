// Server-only data helpers. Imported by Server Components.
import { createServerClient, createServiceClient } from "@/lib/supabase/server";

export interface AppContext {
  userId: string;
  email: string;
  clinicId: string;
  clinicName: string;
}

/**
 * Resolve the signed-in user's clinic, creating one on first sign-in.
 * Clinic + membership creation uses the service role because the schema has no
 * INSERT policy for those tables (intentional — only the server bootstraps them).
 */
export async function getContext(): Promise<AppContext | null> {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Already a member of a clinic?
  const { data: membership } = await supabase
    .from("clinic_members")
    .select("clinic_id, clinics(name)")
    .limit(1)
    .maybeSingle();

  if (membership?.clinic_id) {
    const clinics = membership.clinics as unknown as { name: string } | null;
    return {
      userId: user.id,
      email: user.email ?? "",
      clinicId: membership.clinic_id as string,
      clinicName: clinics?.name ?? "My clinic",
    };
  }

  // Bootstrap a new clinic for this user (service role).
  const admin = createServiceClient();
  const name = (user.email?.split("@")[1]?.split(".")[0] ?? "My") + " clinic";
  const slug = `clinic-${user.id.slice(0, 8)}`;

  const { data: clinic, error: cErr } = await admin
    .from("clinics")
    .insert({ name, slug })
    .select("id, name")
    .single();
  if (cErr || !clinic) throw new Error("Could not create clinic: " + (cErr?.message ?? ""));

  await admin.from("clinic_members").insert({
    clinic_id: clinic.id,
    user_id: user.id,
    role: "owner",
  });
  await admin
    .from("profiles")
    .upsert({ id: user.id, full_name: user.email, default_clinic_id: clinic.id });

  return {
    userId: user.id,
    email: user.email ?? "",
    clinicId: clinic.id as string,
    clinicName: clinic.name as string,
  };
}

export interface PatientRow {
  id: string;
  name: string | null;
  species: string | null;
  breed: string | null;
  weight_kg: number | null;
  status: string;
  updated_at: string;
}

export async function listPatients(): Promise<PatientRow[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("patients")
    .select("id, name, species, breed, weight_kg, status, updated_at")
    .order("updated_at", { ascending: false });
  return (data ?? []) as PatientRow[];
}

export async function getPatient(id: string): Promise<PatientRow | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("patients")
    .select("id, name, species, breed, weight_kg, status, updated_at")
    .eq("id", id)
    .maybeSingle();
  return (data as PatientRow) ?? null;
}

export async function getChart(patientId: string): Promise<any | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("charts")
    .select("*")
    .eq("patient_id", patientId)
    .maybeSingle();
  return data ?? null;
}

export async function listLog(): Promise<any[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("surgical_log")
    .select("*")
    .order("logged_at", { ascending: false });
  return data ?? [];
}
