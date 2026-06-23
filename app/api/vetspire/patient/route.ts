// Server-side Vetspire proxy.
//
// The Vetspire API key grants read/write to the clinic's ENTIRE Vetspire org and must
// be treated like an admin password — so it never leaves the server. The browser calls
// THIS route; this route reads the calling user's clinic token (service role) and talks
// to Vetspire, returning only the patient fields the chart needs.
//
// Endpoint: POST https://api.vetspire.com/graphql  (Authorization: <token>)

import { NextResponse } from "next/server";
import { createServerClient, createServiceClient } from "@/lib/supabase/server";

// Service role + outbound fetch — must run on Node, not the Edge runtime.
export const runtime = "nodejs";

const VETSPIRE_URL = process.env.VETSPIRE_API_URL ?? "https://api.vetspire.com/graphql";

// NOTE: confirm field names against the Vetspire schema explorer before going live.
const PATIENT_QUERY = /* GraphQL */ `
  query PatientLookup($search: String!) {
    clients(searchText: $search, limit: 5) {
      id
      name
      email
      phoneNumber
      patients {
        id
        name
        species
        breed
        sex
        color
        latestWeight
      }
    }
  }
`;

export async function POST(req: Request) {
  const { search, clinicId } = await req.json().catch(() => ({}));
  if (!search || !clinicId) {
    return NextResponse.json({ error: "search and clinicId required" }, { status: 400 });
  }

  // 1. Confirm the caller is a member of the clinic (RLS-scoped session client).
  const supabase = createServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { data: membership } = await supabase
    .from("clinic_members")
    .select("clinic_id")
    .eq("clinic_id", clinicId)
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // 2. Read the clinic's Vetspire token with the service role (clients can never select it).
  const admin = createServiceClient();
  const { data: clinic } = await admin
    .from("clinics")
    .select("vetspire_token")
    .eq("id", clinicId)
    .single();

  const token = clinic?.vetspire_token; // TODO: decrypt (pgcrypto / Supabase Vault)
  if (!token) {
    return NextResponse.json({ error: "Vetspire not configured for this clinic" }, { status: 409 });
  }

  // 3. Call Vetspire.
  const res = await fetch(VETSPIRE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({ query: PATIENT_QUERY, variables: { search } }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: `Vetspire ${res.status}` }, { status: 502 });
  }
  const json = await res.json();
  // Return only what the chart needs.
  return NextResponse.json({ clients: json.data?.clients ?? [] });
}
