"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortItem = { id: string; code: string; label: string; imageUrl: string | null };

// Một nhóm (brand + phân loại) ở chế độ Sắp xếp: kéo tay cầm để đổi chỗ, hoặc
// bấm mũi tên lên/xuống (dễ hơn trên điện thoại khi nhóm dài).
export function CatalogSortGroup({
  id,
  items,
  onReorder,
}: {
  id: string;
  items: SortItem[];
  onReorder: (orderedIds: string[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function move(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return;
    onReorder(arrayMove(items, from, to).map((i) => i.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    move(
      items.findIndex((i) => i.id === active.id),
      items.findIndex((i) => i.id === over.id)
    );
  }

  return (
    <DndContext id={id} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
        <ol className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(min(100%,17rem),1fr))]">
          {items.map((item, index) => (
            <SortableCard
              key={item.id}
              item={item}
              index={index}
              last={index === items.length - 1}
              onMove={(delta) => move(index, index + delta)}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function SortableCard({
  item,
  index,
  last,
  onMove,
}: {
  item: SortItem;
  index: number;
  last: boolean;
  onMove: (delta: number) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 rounded-xl border bg-card p-2",
        isDragging && "relative z-10 shadow-lg ring-2 ring-primary"
      )}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={`Kéo để đổi chỗ ${item.label}`}
        className="flex h-12 w-7 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <span className="w-5 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums">
        {index + 1}
      </span>
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageUrl} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-md border bg-white object-contain" />
      ) : (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-dashed text-muted-foreground">
          <ImageOff className="h-4 w-4" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[11px] text-muted-foreground">{item.code}</p>
        <p className="truncate text-sm font-medium">{item.label}</p>
      </div>
      <div className="flex shrink-0 flex-col">
        <button
          type="button"
          aria-label="Lên một bậc"
          disabled={index === 0}
          onClick={() => onMove(-1)}
          className="flex h-6 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Xuống một bậc"
          disabled={last}
          onClick={() => onMove(1)}
          className="flex h-6 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}
