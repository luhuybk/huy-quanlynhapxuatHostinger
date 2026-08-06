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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { createUser, updateUser, deleteUser } from "@/lib/actions/users";

type Role = "ADMIN" | "SHARED";
type UserItem = { id: string; email: string; name: string; role: Role };

function roleLabel(role: string) {
  return role === "ADMIN" ? "Admin" : "Tài khoản chung";
}

function CreateUserForm({
  onDone,
  isPending,
  startTransition,
}: {
  onDone: () => void;
  isPending: boolean;
  startTransition: (fn: () => Promise<void>) => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("SHARED");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const formData = new FormData();
    formData.set("email", email);
    formData.set("name", name);
    formData.set("password", password);
    formData.set("role", role);
    startTransition(async () => {
      try {
        await createUser(formData);
        toast.success("Đã tạo tài khoản");
        onDone();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Tên</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Mật khẩu</Label>
        <Input
          id="password"
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Vai trò</Label>
        <Select value={role} onValueChange={(v) => setRole(v as Role)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SHARED">Tài khoản chung</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          Lưu
        </Button>
      </DialogFooter>
    </form>
  );
}

function EditUserForm({
  user,
  isSelf,
  onDone,
  isPending,
  startTransition,
}: {
  user: UserItem;
  isSelf: boolean;
  onDone: () => void;
  isPending: boolean;
  startTransition: (fn: () => Promise<void>) => void;
}) {
  const [name, setName] = useState(user.name);
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(user.role);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const formData = new FormData();
    formData.set("name", name);
    formData.set("password", password);
    formData.set("role", role);
    startTransition(async () => {
      try {
        await updateUser(user.id, formData);
        toast.success("Đã cập nhật tài khoản");
        onDone();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-email">Email</Label>
        <Input id="edit-email" value={user.email} disabled />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-name">Tên</Label>
        <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-password">Mật khẩu mới (để trống nếu không đổi)</Label>
        <Input
          id="edit-password"
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Vai trò</Label>
        <Select value={role} onValueChange={(v) => setRole(v as Role)} disabled={isSelf}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SHARED">Tài khoản chung</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
          </SelectContent>
        </Select>
        {isSelf && (
          <p className="text-xs text-muted-foreground">
            Không thể tự đổi vai trò của chính mình.
          </p>
        )}
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          Lưu
        </Button>
      </DialogFooter>
    </form>
  );
}

export function UserManager({
  users,
  currentUserId,
}: {
  users: UserItem[];
  currentUserId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<UserItem | null>(null);

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteUser(id);
        toast.success("Đã xoá tài khoản");
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Không thể xoá — tài khoản đang có phiếu liên quan"
        );
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4" /> Thêm tài khoản
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thêm tài khoản</DialogTitle>
            </DialogHeader>
            <CreateUserForm
              onDone={() => setAddOpen(false)}
              isPending={isPending}
              startTransition={startTransition}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tên</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Vai trò</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell>
                {u.name} {u.id === currentUserId && <Badge variant="secondary">Bạn</Badge>}
              </TableCell>
              <TableCell className="text-muted-foreground">{u.email}</TableCell>
              <TableCell>
                <Badge variant={u.role === "ADMIN" ? "default" : "outline"}>
                  {roleLabel(u.role)}
                </Badge>
              </TableCell>
              <TableCell className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => setEditing(u)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isPending || u.id === currentUserId}
                  onClick={() => handleDelete(u.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {users.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Chưa có tài khoản nào
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa tài khoản</DialogTitle>
          </DialogHeader>
          {editing && (
            <EditUserForm
              user={editing}
              isSelf={editing.id === currentUserId}
              onDone={() => setEditing(null)}
              isPending={isPending}
              startTransition={startTransition}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
