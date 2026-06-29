import { KanbanBoard } from "@/components/projects/kanban-board"

export default async function ProjectKanbanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <KanbanBoard projectId={Number(id)} section="kanban" />
}
