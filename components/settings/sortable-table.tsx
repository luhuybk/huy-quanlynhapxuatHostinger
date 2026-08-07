"use client";

import type { ReactNode } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { Table, TableBody, TableHeader } from "@/components/ui/table";

// DndContext renders a hidden a11y announcement <div> as a sibling of its
// children — if that lives inside <table> (e.g. wrapping just <TableBody>)
// it ends up as an invalid direct child of <table> and breaks hydration.
// Wrapping the whole <Table> keeps that div outside the table element.
export function SortableTable<T extends { id: string }>({
  id,
  items,
  onReorder,
  header,
  className,
  children,
}: {
  // Stable id for DndContext's internal a11y id generator — without it,
  // ids are derived from mount order/count, which differs between server
  // and client when several SortableTables mount at once (e.g. all tabs
  // of a Tabs component render simultaneously), causing hydration mismatches.
  id: string;
  items: T[];
  onReorder: (reordered: T[]) => void;
  header: ReactNode;
  className?: string;
  children: (items: T[]) => ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(items, oldIndex, newIndex));
  }

  return (
    <DndContext id={id} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <Table className={className}>
        <TableHeader>{header}</TableHeader>
        <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          <TableBody>{children(items)}</TableBody>
        </SortableContext>
      </Table>
    </DndContext>
  );
}
