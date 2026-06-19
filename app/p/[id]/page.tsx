import { notFound } from "next/navigation";
import { ChartEditor } from "@/components/ChartEditor";
import { isProjectStorageConfigured, loadProjectEnvelope } from "@/lib/projects";

type SharedProjectPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SharedProjectPage({ params }: SharedProjectPageProps) {
  if (!isProjectStorageConfigured()) notFound();

  const { id } = await params;
  const envelope = await loadProjectEnvelope(id);
  if (!envelope) notFound();

  return <ChartEditor initialProject={envelope.project} />;
}
