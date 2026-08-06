"use client";

import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/(app)/actions";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button variant="ghost" size="sm" type="submit">
        <LogOut className="h-4 w-4" />
        Đăng xuất
      </Button>
    </form>
  );
}
