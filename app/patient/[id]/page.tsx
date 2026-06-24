import { redirect, notFound } from "next/navigation";
import { getContext, getPatient, getChart } from "@/lib/data";
import ChartWorkspace from "@/components/ChartWorkspace";

export const dynamic = "force-dynamic";

export default async function PatientPage({ params }: { params: { id: string } }) {
  const ctx = await getContext();
  if (!ctx) redirect("/login");

  const patient = await getPatient(params.id);
  if (!patient) notFound();
  const chart = await getChart(params.id);

  return <ChartWorkspace patient={patient} chart={chart} />;
}
