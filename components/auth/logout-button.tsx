"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authService } from "@/services/authService";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const clearSession = useAuthStore((state) => state.clearSession);
  const [isPending, setIsPending] = useState(false);

  const handleLogout = async () => {
    try {
      setIsPending(true);
      await authService.logout();
    } catch {
      clearSession();
    } finally {
      setIsPending(false);
      router.replace("/login");
    }
  };

  return (
    <Button
      className="border-white/12 bg-white/8 text-white hover:border-[rgba(210,167,75,0.64)] hover:bg-white/12 hover:text-white"
      disabled={isPending}
      onClick={handleLogout}
      variant="secondary"
    >
      {isPending ? "Signing out..." : "Logout"}
    </Button>
  );
}
