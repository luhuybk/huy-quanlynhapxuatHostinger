"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { cn } from "@/lib/utils";
import { ZONE_COLORS, ZONE_COLOR_KEYS, suggestZoneColor, zoneColor } from "@/lib/zone-colors";
import { createZone, deleteZone, updateZone } from "@/lib/actions/warehouse";
import type { WarehouseLite, ZoneLite } from "@/components/warehouse/types";

function ColorPicker({ defaultValue }: { defaultValue: string }) {
  const [color, setColor] = useState(defaultValue);
  return (
    <div className="flex flex-col gap-2">
      <Label>Màu trên sơ đồ</Label>
      <input type="hidden" name="color" value={color} />
      <div className="flex flex-wrap gap-2">
        {ZONE_COLOR_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            title={ZONE_COLORS[key].label}
            aria-label={ZONE_COLORS[key].label}
            onClick={() => setColor(key)}
            className={cn(
              "h-8 w-8 rounded-full border-2",
              ZONE_COLORS[key].dot,
              color === key ? "border-foreground" : "border-transparent"
            )}
          />
        ))}
      </div>
    </div>
  );
}

function ZoneFormFields({ defaults, zoneCount }: { defaults?: ZoneLite; zoneCount: number }) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="zone-code">Mã khu</Label>
        <Input
          id="zone-code"
          name="code"
          defaultValue={defaults?.code}
          placeholder="1"
          required
        />
        <p className="text-sm text-muted-foreground">
          Đây là phần đứng đầu mã hàng. Có nhiều kho thì đặt kiểu A1, B2 để nhìn
          mã là biết hàng nằm kho nào.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="zone-name">Tên gợi nhớ (không bắt buộc)</Label>
        <Input
          id="zone-name"
          name="name"
          defaultValue={defaults?.name ?? ""}
          placeholder="Kệ sát cửa"
        />
      </div>
      <ColorPicker defaultValue={defaults?.color ?? suggestZoneColor(zoneCount)} />
    </>
  );
}

export function ZoneManager({
  warehouse,
  cellCounts,
  skuCounts,
  canEdit,
}: {
  warehouse: WarehouseLite;
  cellCounts: Record<string, number>;
  skuCounts: Record<string, number>;
  canEdit: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<ZoneLite | null>(null);

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        await createZone(warehouse.id, formData);
        toast.success("Đã thêm khu");
        setAddOpen(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra");
      }
    });
  }

  function handleUpdate(id: string, formData: FormData) {
    startTransition(async () => {
      try {
        await updateZone(id, formData);
        toast.success("Đã cập nhật khu");
        setEditing(null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteZone(id);
        toast.success("Đã xoá khu");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium">Khu vực trong {warehouse.name}</h2>
        {canEdit && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4" /> Thêm khu
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Thêm khu vực</DialogTitle>
              </DialogHeader>
              <form action={handleCreate} className="flex flex-col gap-4">
                <ZoneFormFields zoneCount={warehouse.zones.length} />
                <DialogFooter>
                  <Button type="submit" disabled={isPending}>
                    Lưu
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {warehouse.zones.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Chưa có khu nào trong kho này.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {warehouse.zones.map((z) => {
            const cells = cellCounts[z.id] ?? 0;
            return (
              <li
                key={z.id}
                className="flex flex-wrap items-center gap-2 rounded-md border p-2"
              >
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-sm font-medium",
                    zoneColor(z.color).badge
                  )}
                >
                  {z.code}
                </span>
                <span className="text-sm">{z.name ?? "—"}</span>
                <span className="text-sm text-muted-foreground">
                  {skuCounts[z.id] ?? 0} mã hàng · {cells} ô
                  {cells === 0 && " (chưa tô lên sơ đồ)"}
                </span>
                {canEdit && (
                  <span className="ml-auto flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(z)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <ConfirmDeleteButton
                      disabled={isPending}
                      title="Xoá khu này?"
                      description={`Khu ${z.code} sẽ bị xoá khỏi sơ đồ. ${
                        skuCounts[z.id]
                          ? `${skuCounts[z.id]} mã hàng đang ở khu này sẽ thành "chưa gán khu", không mã nào bị mất.`
                          : ""
                      }`}
                      onConfirm={() => handleDelete(z.id)}
                    />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa khu vực</DialogTitle>
          </DialogHeader>
          {editing && (
            <form
              action={(fd) => handleUpdate(editing.id, fd)}
              className="flex flex-col gap-4"
            >
              <ZoneFormFields defaults={editing} zoneCount={warehouse.zones.length} />
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  Lưu
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
