"use client";

import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/(auth)/login/actions";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export const LogoutButton = () => {
  const router = useRouter();

  const handleLogout = async () => {
    await logoutAction();
    router.push("/login");
    router.refresh();
  };

  return (
    <Button variant="outline" onClick={handleLogout}>
      <LogOut className="h-4 w-4 mr-2" />
      Logout
    </Button>
  );
};
