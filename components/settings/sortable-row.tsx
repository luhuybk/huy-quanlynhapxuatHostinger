"use client";

import type { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";

export function SortableRow({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  if (disabled) return <PlainRow>{children}</PlainRow>;
  return <DraggableRow id={id}>{children}</DraggableRow>;
}

// Giữ nguyên ô tay cầm cho khỏi lệch số cột so với phần đầu bảng.
function PlainRow({ children }: { children: ReactNode }) {
  return (
    <TableRow>
      <TableCell className="w-10" />
      {children}
    </TableRow>
  );
}

function DraggableRow({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  return (
    <TableRow
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "relative z-10 opacity-70" : undefined}
    >
      <TableCell className="w-10 touch-none">
        <button
          type="button"
          className="cursor-grab text-muted-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      {children}
    </TableRow>
  );
}
