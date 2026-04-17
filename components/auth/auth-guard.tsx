"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import type { ReactNode } from "react";

const publicRoutes = new Set([
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/auth/verify-email",
]);

export function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const isPublicRoute = publicRoutes.has(pathname);

    if (!token && !isPublicRoute) {
      router.replace("/login");
      return;
    }

    if (
      token &&
      (pathname === "/login" ||
        pathname === "/register" ||
        pathname === "/forgot-password" ||
        pathname === "/reset-password" ||
        pathname === "/verify-email" ||
        pathname === "/auth/verify-email")
    ) {
      router.replace("/dashboard");
    }
  }, [hasHydrated, pathname, router, token]);

  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="rounded-full border border-[rgba(144,18,20,0.12)] bg-[#fafafa]/70 px-5 py-3 text-sm font-medium text-foreground/70 shadow-[0_14px_32px_rgba(12,13,10,0.08)] backdrop-blur-xl">
          Restoring session...
        </div>
      </div>
    );
  }

  if (!token && !publicRoutes.has(pathname)) {
    return null;
  }

  return <>{children}</>;
}
