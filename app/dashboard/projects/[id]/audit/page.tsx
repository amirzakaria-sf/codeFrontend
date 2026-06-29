import { AuditLogView } from "@/components/projects/audit-log-view"

export default async function AuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <AuditLogView projectId={Number(id)} />
}
