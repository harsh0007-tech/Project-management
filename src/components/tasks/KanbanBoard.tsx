import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";

import { TaskCard } from "@/components/tasks/TaskCard";
import { useAuth } from "@/hooks/useAuth";
import { logActivity, notify, useUpdateTaskStatus } from "@/hooks/useTaskflow";
import { STATUS_LABEL, type Profile, type Task, type TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const COLUMNS: TaskStatus[] = ["todo", "in_progress", "done"];

function DraggableTask({
  task,
  assignee,
  disabled,
  onOpen,
}: {
  task: Task;
  assignee?: Profile | null | undefined;
  disabled: boolean;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id, disabled });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={cn(isDragging && "opacity-40")}>
      <TaskCard task={task} assignee={assignee} onOpen={onOpen} />
    </div>
  );
}

function Column({
  status,
  tasks,
  people,
  disabled,
  onOpenTask,
}: {
  status: TaskStatus;
  tasks: Task[];
  people: Profile[];
  disabled: boolean;
  onOpenTask: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      className={cn(
        "glass-panel flex min-h-[24rem] flex-col gap-3 p-4 transition-colors",
        isOver && "ring-2 ring-primary/40",
      )}
      aria-label={STATUS_LABEL[status]}
    >
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{STATUS_LABEL[status]}</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {tasks.length}
        </span>
      </header>
      <div className="flex flex-col gap-3">
        {tasks.map((task) => (
          <DraggableTask
            key={task.id}
            task={task}
            assignee={people.find((person) => person.id === task.assigned_to) ?? null}
            disabled={disabled}
            onOpen={() => onOpenTask(task)}
          />
        ))}
        {tasks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            Nothing here yet
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function KanbanBoard({
  tasks,
  people,
  canManage,
  onOpenTask,
}: {
  tasks: Task[];
  people: Profile[];
  canManage: boolean;
  onOpenTask: (task: Task) => void;
}) {
  const { profile, workspace } = useAuth();
  const updateStatus = useUpdateTaskStatus(workspace?.id);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const grouped = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], done: [] };
    for (const task of tasks) map[task.status].push(task);
    return map;
  }, [tasks]);

  const activeTask = tasks.find((task) => task.id === activeId) ?? null;

  const onDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id));

  const onDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || !profile) return;
    const status = String(over.id) as TaskStatus;
    const task = tasks.find((item) => item.id === String(active.id));
    if (!task || task.status === status) return;
    if (!canManage && task.assigned_to !== profile.id) {
      toast.error("You can only move tasks assigned to you.");
      return;
    }
    try {
      await updateStatus.mutateAsync({ taskId: task.id, status });
      await logActivity({
        workspaceId: workspace?.id ?? null,
        userId: profile.id,
        taskId: task.id,
        action: `moved "${task.title}" to ${STATUS_LABEL[status]}`,
      });
      if (status === "done") {
        await notify({
          userId: task.created_by,
          selfId: profile.id,
          type: "task_completed",
          message: `${profile.name} completed "${task.title}"`,
          taskId: task.id,
        });
      }
    } catch (error) {
      console.error(error);
      toast.error("Unable to move the task. Please try again.");
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="grid gap-4 lg:grid-cols-3">
        {COLUMNS.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={grouped[status]}
            people={people}
            disabled={false}
            onOpenTask={onOpenTask}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <TaskCard
            task={activeTask}
            assignee={people.find((person) => person.id === activeTask.assigned_to) ?? null}
            className="rotate-1 shadow-xl"
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
