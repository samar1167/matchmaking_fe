"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useChatTotalUnreadCount } from "@/hooks/useChatNotifications";
import { cn } from "@/lib/cn";
import { authService } from "@/services/authService";
import { profileService } from "@/services/profileService";
import { useAuthStore } from "@/store/authStore";

const navLinks = [
  { href: "/?view=public", label: "Home" },
  { href: "/private-persons", label: "Private User" },
  { href: "/connections", label: "Connections" },
  { href: "/dashboard", label: "Me" },
];

function LusterLogo() {
  return (
    <Link href="/?view=public" className="flex min-w-max items-center gap-3 text-[#901214]">
      <span className="relative flex h-8 w-8 items-center justify-center" aria-hidden="true">
        <span className="absolute left-1 top-1 h-5 w-5 rotate-45 rounded-tl-full rounded-tr-full border-2 border-[#901214]" />
        <span className="absolute right-1 top-1 h-5 w-5 -rotate-45 rounded-tl-full rounded-tr-full border-2 border-[#901214]" />
      </span>
      <span className="font-display text-3xl font-bold leading-none tracking-tight">
        Luster
      </span>
    </Link>
  );
}

function BellIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 0 1-6 0m6 0H9"
      />
    </svg>
  );
}

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const unreadCount = useChatTotalUnreadCount();
  const [profileFirstName, setProfileFirstName] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!token) {
      setProfileFirstName(null);
      return;
    }

    const userFirstName = user?.first_name?.trim();

    if (userFirstName) {
      setProfileFirstName(userFirstName);
      return;
    }

    let cancelled = false;

    void profileService
      .getMe()
      .then((response) => {
        if (cancelled) {
          return;
        }

        const profile = response.results[0];
        const nextFirstName =
          profile?.first_name?.trim() || profile?.user?.first_name?.trim() || null;
        setProfileFirstName(nextFirstName);
      })
      .catch(() => {
        if (!cancelled) {
          setProfileFirstName(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, user?.first_name]);

  const displayName = useMemo(() => {
    if (profileFirstName) {
      return profileFirstName;
    }

    if (user?.first_name?.trim()) {
      return user.first_name.trim();
    }

    if (user?.username?.trim()) {
      return user.username.trim().split(/\s+/)[0];
    }

    if (user?.email?.trim()) {
      return user.email.trim().split("@")[0];
    }

    return "User";
  }, [profileFirstName, user]);

  const visibleUnreadCount = unreadCount > 99 ? "99+" : String(unreadCount);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await authService.logout();
    } catch {
      clearSession();
    } finally {
      setIsLoggingOut(false);
      router.replace("/login");
    }
  };

  return (
    <header className="border-b border-[#EABFB9] bg-[#fafafa] px-4 py-4 text-[#2d1718] sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl items-center gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <div className="flex justify-center lg:justify-start">
          <LusterLogo />
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-2 text-sm font-semibold text-[#2d1718]/75 sm:gap-4">
          {navLinks.map((link) => {
            const isActive =
              link.href.startsWith("/?") ? pathname === "/" : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-2 transition hover:bg-[#fdf1f0] hover:text-[#901214]",
                  isActive && "bg-[#fdf1f0] text-[#901214]",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-end">
          {token ? (
            <>
              <Link
                href="/connections"
                aria-label={
                  unreadCount > 0
                    ? `${visibleUnreadCount} unread chat messages`
                    : "No unread chat messages"
                }
                className="relative inline-flex h-11 w-11 items-center justify-center rounded-md border border-[#C07771] bg-[#fafafa] text-[#901214] transition hover:border-[#901214] hover:bg-[#fdf1f0]"
              >
                <BellIcon />
                <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#901214] px-1.5 text-[10px] font-bold leading-none text-white">
                  {visibleUnreadCount}
                </span>
              </Link>
              <span className="max-w-32 truncate text-sm font-bold text-[#2d1718]">
                {displayName}
              </span>
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#C07771] bg-[#fafafa] px-5 text-sm font-bold text-[#901214] transition hover:border-[#901214] hover:bg-[#fdf1f0] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoggingOut}
                type="button"
                onClick={handleLogout}
              >
                {isLoggingOut ? "Signing out..." : "Logout"}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#C07771] bg-[#fafafa] px-5 text-sm font-bold text-[#901214] transition hover:border-[#901214] hover:bg-[#fdf1f0]"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#901214] px-5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(144,18,20,0.14)] transition hover:bg-[#961116]"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
