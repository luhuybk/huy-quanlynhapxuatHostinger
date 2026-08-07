"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { createAgent, updateAgent, deleteAgent, reorderAgents } from "@/lib/actions/catalog";
import { SortableTable } from "@/components/settings/sortable-table";
import { SortableRow } from "@/components/settings/sortable-row";

type Agent = {
  id: string;
  name: string;
  note: string | null;
  ownerId: string | null;
  owner: { name: string } | null;
};
type Owner = { id: string; name: string };

function AgentFormFields({
  owners,
  isAdmin,
  defaults,
}: {
  owners: Owner[];
  isAdmin: boolean;
  defaults?: Agent;
}) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Tên đại lý</Label>
        <Input id="name" name="name" defaultValue={defaults?.name} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="note">Ghi chú</Label>
        <Input id="note" name="note" defaultValue={defaults?.note ?? ""} />
      </div>
      {isAdmin && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="ownerId">Chủ sở hữu</Label>
          <Select name="ownerId" defaultValue={defaults?.ownerId ?? "none"}>
            <SelectTrigger id="ownerId">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Chung (mọi người)</SelectItem>
              {owners.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Nếu chọn một nhân viên, chỉ nhân viên đó (và Admin) mới thấy đại lý này và các
            phiếu xuất liên quan.
          </p>
        </div>
      )}
    </>
  );
}

export function AgentManager({
  agents,
  owners,
  isAdmin,
}: {
  agents: Agent[];
  owners: Owner[];
  isAdmin: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [items, setItems] = useState(agents);
  const [prevAgents, setPrevAgents] = useState(agents);
  if (agents !== prevAgents) {
    setPrevAgents(agents);
    setItems(agents);
  }

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        await createAgent(formData);
        toast.success("Đã thêm đại lý");
        setAddOpen(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra");
      }
    });
  }

  function handleUpdate(id: string, formData: FormData) {
    startTransition(async () => {
      try {
        await updateAgent(id, formData);
        toast.success("Đã cập nhật đại lý");
        setEditing(null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteAgent(id);
        toast.success("Đã xoá đại lý");
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Không thể xoá — có thể đang được dùng cho phiếu xuất"
        );
      }
    });
  }

  function handleReorder(reordered: Agent[]) {
    setItems(reordered);
    startTransition(async () => {
      await reorderAgents(reordered.map((a) => a.id));
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4" /> Thêm đại lý
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thêm đại lý</DialogTitle>
            </DialogHeader>
            <form action={handleCreate} className="flex flex-col gap-4">
              <AgentFormFields owners={owners} isAdmin={isAdmin} />
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  Lưu
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <SortableTable
        id="agent-manager"
        items={items}
        onReorder={handleReorder}
        header={
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>Tên đại lý</TableHead>
            <TableHead>Ghi chú</TableHead>
            <TableHead>Chủ sở hữu</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        }
      >
        {(sorted) => (
          <>
            {sorted.map((a) => (
              <SortableRow key={a.id} id={a.id}>
                <TableCell>{a.name}</TableCell>
                <TableCell className="text-muted-foreground">{a.note}</TableCell>
                <TableCell>
                  {a.owner ? (
                    <Badge variant="outline">{a.owner.name}</Badge>
                  ) : (
                    <Badge variant="secondary">Chung</Badge>
                  )}
                </TableCell>
                <TableCell className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setEditing(a)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={isPending}
                    onClick={() => handleDelete(a.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </SortableRow>
            ))}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Chưa có đại lý nào
                </TableCell>
              </TableRow>
            )}
          </>
        )}
      </SortableTable>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa đại lý</DialogTitle>
          </DialogHeader>
          {editing && (
            <form
              action={(fd) => handleUpdate(editing.id, fd)}
              className="flex flex-col gap-4"
            >
              <AgentFormFields owners={owners} isAdmin={isAdmin} defaults={editing} />
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
