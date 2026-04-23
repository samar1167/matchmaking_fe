"use client";

import { isAxiosError } from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";
import { CompatibilityScoreLine } from "@/components/ui/compatibility-score";
import { useChatTotalUnreadCount } from "@/hooks/useChatNotifications";
import { compatibilityService } from "@/services/compatibilityService";
import { connectionService } from "@/services/connectionService";
import { normalizeCompatibilityResults } from "@/services/compatibilityMapper";
import { normalizePlanParameters } from "@/services/planMapper";
import { planService } from "@/services/planService";
import { privatePersonsService } from "@/services/privatePersonsService";
import { profileService } from "@/services/profileService";
import { userMatchService } from "@/services/userMatchService";
import { useAuthStore } from "@/store/authStore";
import { usePlanStore } from "@/store/planStore";
import { useResultsStore, type StoredCompatibilityResult } from "@/store/resultsStore";
import type { ApiErrorResponse } from "@/types/common";
import type { Connection } from "@/types/connection";
import type { PrivatePerson } from "@/types/private-persons";
import type { PlanParameters } from "@/types/plan";
import type { UserProfile } from "@/types/profile";
import type { UserMatch } from "@/types/user-match";

const heroRotatingWords = ["sex", "love", "friendship", "time"];

type ServerMessagePayload =
  | ApiErrorResponse
  | string
  | string[]
  | Record<string, string | string[] | Record<string, string[]>>;

const getServerMessage = (payload: ServerMessagePayload | undefined) => {
  if (!payload) {
    return null;
  }

  if (typeof payload === "string") {
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.find((value): value is string => typeof value === "string") || null;
  }

  if (typeof payload !== "object") {
    return null;
  }

  if ("message" in payload && typeof payload.message === "string") {
    return payload.message;
  }

  if ("detail" in payload && typeof payload.detail === "string") {
    return payload.detail;
  }

  if ("error" in payload && typeof payload.error === "string") {
    return payload.error;
  }

  if ("details" in payload && payload.details && typeof payload.details === "object") {
    const detailError = Object.values(payload.details)
      .flatMap((value) => (Array.isArray(value) ? value : []))
      .find((value): value is string => typeof value === "string");

    if (detailError) {
      return detailError;
    }
  }

  const fieldError = Object.values(payload)
    .flatMap((value) => {
      if (typeof value === "string") {
        return [value];
      }

      if (Array.isArray(value)) {
        return value;
      }

      return [];
    })
    .find((value): value is string => typeof value === "string");

  return fieldError || null;
};

const extractActionErrorMessage = (error: unknown, fallback: string) => {
  if (isAxiosError<ServerMessagePayload>(error)) {
    return getServerMessage(error.response?.data) || fallback;
  }

  return fallback;
};

const formatTimestamp = (value?: string) => {
  if (!value) {
    return "Just now";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const getProfileDisplayName = (profile: UserProfile) => {
  const firstName = profile.first_name ?? profile.user?.first_name ?? "";
  const lastName = profile.last_name ?? profile.user?.last_name ?? "";
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || profile.user?.username || `Profile #${profile.id}`;
};

const getProfileInitials = (profile: UserProfile) => {
  const name = getProfileDisplayName(profile);
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return initials || "UM";
};

const getConnectionPeer = (connection: Connection, currentProfileId?: number) => {
  if (!connection.requester || !connection.receiver) {
    return connection;
  }

  if (!currentProfileId) {
    return connection.requester;
  }

  return connection.requester.id === currentProfileId
    ? connection.receiver
    : connection.requester;
};

const getConnectionForProfile = (
  connections: Connection[],
  profileId?: number | string,
) => {
  if (!profileId) {
    return null;
  }

  const targetProfileId = String(profileId);

  return (
    connections.find(
      (connection) =>
        String(connection.id) === targetProfileId ||
        String(connection.requester?.id) === targetProfileId ||
        String(connection.receiver?.id) === targetProfileId,
    ) ?? null
  );
};

const withDefaultConnectionStatus = (
  connections: Connection[],
  status: Connection["status"],
) => connections.map((connection) => ({ ...connection, status: connection.status ?? status }));

const isLockedParameter = (key: string, parameters: PlanParameters) => {
  const direct = parameters[key];

  if (direct && direct.paid && !direct.free) {
    return true;
  }

  const finalSegment = key.split(".").at(-1);

  if (!finalSegment) {
    return false;
  }

  const fallback = parameters[finalSegment];

  return Boolean(fallback?.paid && !fallback.free);
};

const shouldBlurParameter = (
  parameter: StoredCompatibilityResult["parameters"][number],
  parameters: PlanParameters,
) => {
  if (typeof parameter.locked === "boolean") {
    return parameter.locked;
  }

  return isLockedParameter(parameter.key, parameters);
};

function LockedInsightCard({
  label,
  value,
  cta,
}: {
  label: string;
  value: string;
  cta: string;
}) {
  return (
    <div className="relative isolate overflow-hidden rounded-2xl border border-[#eabfb9]/20 bg-[linear-gradient(180deg,rgba(144,18,20,0.88)_0%,rgba(127,83,62,0.96)_100%)] p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(245,213,200,0.18),transparent_45%)]" />
      <p className="relative text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f5d5c8]">
        Locked Insight
      </p>
      <p className="relative mt-3 text-sm font-medium text-white">{label}</p>
      <p className="relative mt-3 select-none text-sm leading-7 text-[#f5d5c8] blur-sm">
        {value}
      </p>
      <div className="absolute inset-x-5 top-1/2 -translate-y-1/2 rounded-xl border border-[#f5d5c8]/20 bg-[#0c0d0a]/80 px-3 py-3 text-center backdrop-blur-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#f5d5c8]">
          Unlock Required
        </p>
        <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[#fafafa]">
          {cta}
        </p>
      </div>
    </div>
  );
}

const createPaymentReference = (credits: number) => {
  const suffix =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : String(Date.now());

  return `homepage-${credits}-${suffix}`;
};

function HomeShell({
  children,
  actions,
}: {
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(162,46,52,0.22),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(178,128,107,0.16),transparent_20%),linear-gradient(180deg,#0c0d0a_0%,#901214_45%,#7f533e_100%)] px-6 py-8 text-white sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-[1.75rem] border border-white/10 bg-white/5 px-5 py-4 shadow-[0_24px_80px_rgba(12,13,10,0.45)] backdrop-blur-xl">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#f5d5c8]">
              LUSTER
            </p>
            <p className="mt-2 text-sm text-[#eabfb9]">
              For the best <RotatingHeroWord /> of your life.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">{actions}</div>
        </header>
        {children}
      </div>
    </main>
  );
}

function Surface({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(144,18,20,0.9)_0%,rgba(127,83,62,0.82)_100%)] p-6 shadow-[0_24px_80px_rgba(12,13,10,0.36)] backdrop-blur-xl ${className}`}
    >
      {children}
    </section>
  );
}

function MiniActionLink({
  badge,
  href,
  children,
  tone = "default",
}: {
  badge?: number;
  href: string;
  children: ReactNode;
  tone?: "default" | "gold";
}) {
  const visibleBadge = badge && badge > 0 ? (badge > 99 ? "99+" : String(badge)) : null;

  return (
    <Link
      href={href}
      className={`relative inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition ${
        tone === "gold"
          ? "border border-[#f5d5c8]/45 bg-[#f5d5c8] text-[#0c0d0a] hover:bg-[#eabfb9]"
          : "border border-white/12 bg-white/6 text-white hover:border-[#f5d5c8]/45 hover:bg-white/10"
      }`}
    >
      {children}
      {visibleBadge ? (
        <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full border border-[#fafafa] bg-[#901214] px-1.5 text-[10px] font-bold leading-none text-[#fafafa] shadow-[0_8px_18px_rgba(12,13,10,0.24)]">
          {visibleBadge}
        </span>
      ) : null}
    </Link>
  );
}

function RotatingHeroWord() {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setWordIndex((currentIndex) => (currentIndex + 1) % heroRotatingWords.length);
    }, 1500);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <span
      key={heroRotatingWords[wordIndex]}
      className="hero-rotating-word inline-block min-w-[6.9em] text-[#f5d5c8]"
      aria-live="polite"
    >
      {heroRotatingWords[wordIndex]}
    </span>
  );
}

const landingNavLinks = [
  "How It Works",
  "Find Matches",
  "Compatibility Check",
  "About Us",
  "Blog",
];

const reportMetrics = [
  { label: "Long-term compatibility", value: 82 },
  { label: "Emotional alignment", value: 88 },
  { label: "Physical attraction", value: 76 },
  { label: "Communication", value: 84 },
  { label: "Conflict resolution", value: 79 },
];

const trustItems = [
  {
    icon: "✓",
    title: "Science-backed approach",
    copy: "Compatibility based on real relationship dynamics.",
  },
  {
    icon: "◎",
    title: "Long-term focused",
    copy: "Built for relationship longevity, not just attraction.",
  },
  {
    icon: "▥",
    title: "Actionable insights",
    copy: "Clear, practical insights you can act on.",
  },
  {
    icon: "⊘",
    title: "No vague predictions",
    copy: "No astrology. No guesswork. Just real compatibility.",
  },
];

const processSteps = [
  {
    icon: "01",
    title: "Enter Details",
    copy: "Add the essentials once, with privacy-first inputs designed for serious decisions.",
  },
  {
    icon: "02",
    title: "Get Compatibility Breakdown",
    copy: "Review emotional, physical, communication, and long-term alignment in one report.",
  },
  {
    icon: "03",
    title: "Decide with Clarity",
    copy: "Use plain-language insights to understand fit before the relationship gets costly.",
  },
];

const testimonials = [
  {
    initials: "MR",
    name: "Maya R.",
    location: "Austin, TX",
    quote:
      "Luster helped me separate chemistry from actual long-term fit. The report was direct without feeling clinical.",
  },
  {
    initials: "DN",
    name: "Daniel N.",
    location: "Chicago, IL",
    quote:
      "The communication and conflict sections gave us language for conversations we kept avoiding.",
  },
  {
    initials: "SK",
    name: "Sofia K.",
    location: "San Diego, CA",
    quote:
      "I used it before committing more time, and the key insights were more useful than another vague quiz.",
  },
];

function LandingIcon({ children }: { children: ReactNode }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#EABFB9] bg-[#fafafa] text-xl font-semibold text-[#961116]">
      {children}
    </span>
  );
}

function LandingButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link
      href={href}
      className={
        variant === "primary"
          ? "inline-flex min-h-12 items-center justify-center rounded-[0.4rem] bg-[#901214] px-6 text-sm font-bold text-white shadow-[0_14px_28px_rgba(144,18,20,0.16)] transition hover:bg-[#961116]"
          : "inline-flex min-h-12 items-center justify-center rounded-[0.4rem] border border-[#C07771] bg-[#fafafa] px-6 text-sm font-bold text-[#901214] transition hover:border-[#901214]"
      }
    >
      {children}
    </Link>
  );
}

function CompatibilityReportCard() {
  return (
    <div className="rounded-2xl border border-[#EABFB9] bg-[#fafafa] p-6 shadow-[0_18px_42px_rgba(144,18,20,0.12)]">
      <h2 className="text-center text-xl font-bold tracking-tight text-[#2d1718]">
        Your Compatibility Snapshot
      </h2>

      <div className="mt-5 flex items-center justify-center gap-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#C07771] bg-[#EABFB9] text-xl font-bold text-[#901214]">
          A
        </div>
        <div className="flex min-w-40 flex-col items-center">
          <div className="flex w-full items-center gap-3">
            <span className="h-px flex-1 border-t border-dashed border-[#C07771]" />
            <span className="text-xl text-[#901214]">♥</span>
            <span className="h-px flex-1 border-t border-dashed border-[#C07771]" />
          </div>
          <p className="mt-2 text-sm font-bold text-[#2d1718]">You & Alex</p>
        </div>
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#C07771] bg-[#EABFB9] text-xl font-bold text-[#901214]">
          Y
        </div>
      </div>

      <div className="mt-6 space-y-3.5">
        {reportMetrics.map((metric) => (
          <div key={metric.label} className="grid grid-cols-[1fr_1.25fr_auto] items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#EABFB9] text-xs text-[#901214]">
                ♥
              </span>
              <span className="text-xs font-semibold text-[#2d1718]">{metric.label}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#EABFB9]">
              <div
                className="h-full rounded-full bg-[#A22E34]"
                style={{ width: `${metric.value}%` }}
              />
            </div>
            <span className="min-w-16 text-right text-xs font-bold text-[#2d1718]">
              {metric.label === "Long-term compatibility"
                ? `${metric.value}%`
                : metric.value > 85
                  ? "High"
                  : metric.value > 80
                    ? "Good"
                    : "Moderate"}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-[#EABFB9] bg-[#fdf1f0] p-4">
        <p className="text-sm font-bold text-[#901214]">Key Insight</p>
        <p className="mt-1 text-sm leading-6 text-[#2d1718]">
          You share strong values and long-term goals. Work on communication
          style under stress.
        </p>
        <p className="mt-3 text-sm font-bold text-[#901214]">View Full Report →</p>
      </div>
    </div>
  );
}

function LusterLogo() {
  return (
    <Link href="/" className="flex items-center gap-3 text-[#901214]">
      <span className="relative flex h-8 w-8 items-center justify-center">
        <span className="absolute left-1 top-1 h-5 w-5 rotate-45 rounded-tl-full rounded-tr-full border-2 border-[#901214]" />
        <span className="absolute right-1 top-1 h-5 w-5 -rotate-45 rounded-tl-full rounded-tr-full border-2 border-[#901214]" />
      </span>
      <span className="font-display text-3xl font-bold leading-none tracking-tight">
        Luster
      </span>
    </Link>
  );
}

function StepCard({
  icon,
  title,
  copy,
}: {
  icon: string;
  title: string;
  copy: string;
}) {
  return (
    <div className="relative rounded-xl border border-[#EABFB9] bg-[#fafafa] p-5 shadow-[0_10px_24px_rgba(144,18,20,0.05)]">
      <div className="absolute -top-3 left-6 flex h-7 w-7 items-center justify-center rounded-full bg-[#901214] text-sm font-bold text-white">
        {icon}
      </div>
      <div className="flex gap-4 pt-3">
        <LandingIcon>{icon === "1" ? "♙" : icon === "2" ? "▤" : "♡"}</LandingIcon>
        <div>
          <h3 className="text-sm font-bold text-[#2d1718]">{title}</h3>
          <p className="mt-2 text-xs leading-5 text-[#2d1718]/75">
            {copy}
          </p>
        </div>
      </div>
    </div>
  );
}

function PersonCluster() {
  return (
    <div className="relative h-36">
      <div className="absolute left-1/2 top-4 h-24 w-24 -translate-x-1/2 rounded-full border border-dashed border-[#C07771]" />
      <div className="absolute left-4 top-14 flex h-14 w-14 items-center justify-center rounded-full border border-[#C07771] bg-[#EABFB9] text-lg font-bold text-[#901214]">
        A
      </div>
      <div className="absolute right-4 top-14 flex h-14 w-14 items-center justify-center rounded-full border border-[#C07771] bg-[#EABFB9] text-lg font-bold text-[#901214]">
        B
      </div>
      <div className="absolute left-1/2 top-0 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full border border-[#C07771] bg-[#EABFB9] text-lg font-bold text-[#901214]">
        C
      </div>
      <div className="absolute left-1/2 top-16 -translate-x-1/2 text-4xl text-[#901214]">
        ♥
      </div>
    </div>
  );
}

function UseCaseIllustration({ variant }: { variant: "known" | "discover" }) {
  if (variant === "discover") {
    return <PersonCluster />;
  }

  return (
    <div className="relative h-36 overflow-hidden">
      <div className="absolute bottom-0 left-12 h-28 w-20 rounded-t-full bg-[#C07771]" />
      <div className="absolute bottom-0 right-20 h-32 w-24 rounded-t-full bg-[#B2806B]" />
      <div className="absolute bottom-20 left-16 h-12 w-12 rounded-full bg-[#EABFB9]" />
      <div className="absolute bottom-24 right-24 h-12 w-12 rounded-full bg-[#EABFB9]" />
      <div className="absolute bottom-0 right-0 h-20 w-36 rounded-t-full bg-[#EABFB9]/70" />
    </div>
  );
}

function TestimonialCard({
  initials,
  quote,
  name,
  location,
}: {
  initials: string;
  quote: string;
  name: string;
  location: string;
}) {
  return (
    <div className="rounded-xl border border-[#EABFB9] bg-[#fafafa] p-5 shadow-[0_10px_24px_rgba(144,18,20,0.05)]">
      <p className="font-display text-4xl leading-none text-[#C07771]">“</p>
      <p className="mt-1 min-h-14 text-sm leading-6 text-[#2d1718]">
        {quote}
      </p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EABFB9] text-sm font-bold text-[#901214]">
            {initials}
          </div>
          <div>
            <p className="text-sm font-bold text-[#2d1718]">– {name}</p>
            <p className="text-xs text-[#2d1718]/65">{location}</p>
          </div>
        </div>
        <p className="text-xs tracking-[0.18em] text-[#901214]">★★★★★</p>
      </div>
    </div>
  );
}

function ComparisonRow({
  other,
  luster,
}: {
  other: string;
  luster: string;
}) {
  return (
    <div className="grid grid-cols-2 border-t border-[#EABFB9] text-sm">
      <div className="flex items-center gap-3 border-r border-[#EABFB9] px-6 py-3 text-[#2d1718]">
        <span className="text-[#A22E34]">⊗</span>
        {other}
      </div>
      <div className="flex items-center gap-3 px-6 py-3 text-[#2d1718]">
        <span className="text-[#7F533E]">✓</span>
        {luster}
      </div>
    </div>
  );
}

function PublicLandingPage() {
  return (
    <main className="min-h-screen bg-[#fffafa] text-[#2d1718]">
      <nav className="border-b border-[#EABFB9] bg-[#fafafa] px-8 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8">
          <LusterLogo />
          <div className="hidden items-center gap-10 text-sm font-semibold text-[#2d1718]/75 lg:flex">
            {landingNavLinks.map((link) => (
              <a key={link} href={`#${link.toLowerCase().replaceAll(" ", "-")}`}>
                {link}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden rounded-md border border-[#C07771] px-7 py-3 text-sm font-bold text-[#901214] sm:inline-flex"
            >
              Log In
            </Link>
            <LandingButton href="/register">Sign Up</LandingButton>
          </div>
        </div>
      </nav>

      <section className="bg-[linear-gradient(180deg,#fffafa_0%,#fdf1f0_100%)] px-8 py-12">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full bg-[#EABFB9] px-4 py-2 text-sm font-bold text-[#901214]">
              real compatibility. real relationships.
            </p>
            <h1 className="mt-6 max-w-3xl font-display text-6xl font-bold leading-[1.08] tracking-tight text-[#2d1718]">
              Know if a relationship will <span className="italic text-[#901214]">actually</span> work — before you invest in it.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#2d1718]/75">
              We analyze what truly matters: emotional alignment, physical
              attraction, communication, and long-term potential.
            </p>
            <div className="mt-8 flex flex-wrap gap-5">
              <LandingButton href="/compatibility">Check Compatibility →</LandingButton>
              <LandingButton href="#how-it-works" variant="secondary">
                See How It Works ▶
              </LandingButton>
            </div>
            <div className="mt-8 flex items-center gap-4">
              <div className="flex -space-x-2">
                {["A", "R", "K", "M"].map((initial) => (
                  <span
                    key={initial}
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#fafafa] bg-[#EABFB9] text-xs font-bold text-[#901214]"
                  >
                    {initial}
                  </span>
                ))}
              </div>
              <p className="text-sm text-[#2d1718]/70">
                Join 50,000+ people making smarter relationship decisions
              </p>
            </div>
          </div>
          <CompatibilityReportCard />
        </div>
      </section>

      <section className="border-y border-[#EABFB9] bg-[#fafafa] px-8 py-5">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-4">
          {trustItems.map((item) => (
            <div
              key={item.title}
              className="flex gap-4 border-[#EABFB9] md:border-r md:pr-6 md:last:border-r-0"
            >
              <LandingIcon>{item.icon}</LandingIcon>
              <div>
                <p className="text-sm font-bold text-[#2d1718]">{item.title}</p>
                <p className="mt-1 text-xs leading-5 text-[#2d1718]/72">{item.copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="px-8 py-8">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="font-display text-3xl font-bold text-[#2d1718]">How It Works</h2>
          <p className="mt-1 text-sm text-[#2d1718]/70">Simple. Fast. Actually useful.</p>
          <div className="mt-7 grid items-center gap-5 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
            <StepCard icon="1" title="Enter Details" copy="Add basic information about you and the other person." />
            <span className="hidden text-3xl text-[#A22E34] md:block">→</span>
            <StepCard icon="2" title="Get Compatibility Breakdown" copy="We analyze across multiple dimensions that truly matter." />
            <span className="hidden text-3xl text-[#A22E34] md:block">→</span>
            <StepCard icon="3" title="Decide with Clarity" copy="Understand what will work, what won’t, and why." />
          </div>
        </div>
      </section>

      <section id="find-matches" className="px-8 pb-4">
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2">
          <div className="grid min-h-44 grid-cols-[1fr_1.15fr] overflow-hidden rounded-xl border border-[#EABFB9] bg-[#fdf1f0]">
            <div className="p-7">
              <h3 className="font-display text-3xl font-bold leading-tight text-[#2d1718]">
                Check Someone You Already Know
              </h3>
              <p className="mt-3 text-sm leading-6 text-[#2d1718]/75">
                Analyze your compatibility privately and get honest insights.
              </p>
              <div className="mt-4">
                <LandingButton href="/compatibility">Analyze a Relationship →</LandingButton>
              </div>
            </div>
            <UseCaseIllustration variant="known" />
          </div>

          <div className="grid min-h-44 grid-cols-[1fr_1fr] overflow-hidden rounded-xl border border-[#EABFB9] bg-[#fdf1f0]">
            <div className="p-7">
              <h3 className="font-display text-3xl font-bold leading-tight text-[#2d1718]">
                Find Compatible People
              </h3>
              <p className="mt-3 text-sm leading-6 text-[#2d1718]/75">
                Discover people who match your relationship profile and values.
              </p>
              <div className="mt-4">
                <LandingButton href="/register">Find Matches →</LandingButton>
              </div>
            </div>
            <PersonCluster />
          </div>
        </div>
      </section>

      <section id="compatibility-check" className="px-8 py-4">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center font-display text-3xl font-bold text-[#2d1718]">
            Why Luster Works Better
          </h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-[#EABFB9] bg-[#fafafa]">
            <div className="grid grid-cols-[1fr_auto_1fr] bg-[#A22E34] text-sm font-bold text-white">
              <div className="px-6 py-3 text-center">Others</div>
              <div className="flex h-9 w-9 translate-y-2 items-center justify-center rounded-full bg-[#901214] text-xs">
                VS
              </div>
              <div className="px-6 py-3 text-center">Luster</div>
            </div>
            <ComparisonRow other="Astrology and vague predictions" luster="Real compatibility factors" />
            <ComparisonRow other="Guess-based matching" luster="Structured compatibility analysis" />
            <ComparisonRow other="Vague and generic insights" luster="Detailed, actionable breakdown" />
            <ComparisonRow other="Entertainment value" luster="Built for real relationship decisions" />
          </div>
        </div>
      </section>

      <section id="about-us" className="px-8 py-5">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center font-display text-3xl font-bold text-[#2d1718]">
            Loved by People Making Smarter Choices
          </h2>
          <div className="mt-4 grid gap-5 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <TestimonialCard key={testimonial.name} {...testimonial} />
            ))}
          </div>
          <div className="mt-4 flex justify-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#901214]" />
            <span className="h-3 w-3 rounded-full border border-[#EABFB9]" />
            <span className="h-3 w-3 rounded-full border border-[#EABFB9]" />
          </div>
        </div>
      </section>

      <section className="px-8 py-5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 overflow-hidden rounded-xl bg-[#901214] px-8 py-5 text-white md:flex-row">
          <div>
            <h2 className="font-display text-3xl font-bold">
              Don’t guess something this important.
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-white/90">
              Check compatibility before you invest your time, energy, and emotions.
            </p>
          </div>
          <div className="text-center">
            <Link
              href="/compatibility"
              className="inline-flex min-h-12 items-center justify-center rounded-md bg-[#fafafa] px-12 text-sm font-bold text-[#901214]"
            >
              Check Compatibility Now →
            </Link>
            <p className="mt-3 text-sm text-white/90">🔒 It’s free to get started</p>
          </div>
          <div className="hidden text-8xl leading-none text-[#C07771]/45 lg:block">♡</div>
        </div>
      </section>

      <footer className="border-t border-[#EABFB9] bg-[#fffafa] px-8 py-5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
          <LusterLogo />
          <div className="flex flex-wrap justify-center gap-8 text-sm text-[#2d1718]/70">
            {[
              "About Us",
              "How It Works",
              "Privacy Policy",
              "Terms of Service",
              "Contact Us",
            ].map((link) => (
              <Link key={link} href="/">
                {link}
              </Link>
            ))}
          </div>
          <div className="flex gap-4 text-[#901214]">
            <span>●</span>
            <span>◎</span>
            <span>◒</span>
            <span>in</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

export function HomeManager() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const totalUnreadCount = useChatTotalUnreadCount();
  const parameters = usePlanStore((state) => state.parameters);
  const setCredits = usePlanStore((state) => state.setCredits);
  const setParameters = usePlanStore((state) => state.setParameters);
  const setResults = useResultsStore((state) => state.setResults);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [privatePersons, setPrivatePersons] = useState<PrivatePerson[]>([]);
  const [topMatches, setTopMatches] = useState<StoredCompatibilityResult[]>([]);
  const [history, setHistory] = useState<StoredCompatibilityResult[]>([]);
  const [userMatches, setUserMatches] = useState<UserMatch[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [receivedConnectionRequests, setReceivedConnectionRequests] = useState<Connection[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [userMatchesLoadError, setUserMatchesLoadError] = useState<string | null>(null);
  const [connectionsLoadError, setConnectionsLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isRunningCheck, setIsRunningCheck] = useState(false);
  const [isPurchasingCredits, setIsPurchasingCredits] = useState<number | null>(null);
  const [pendingConnectionAction, setPendingConnectionAction] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    void (async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        setUserMatchesLoadError(null);
        setConnectionsLoadError(null);

        const [
          topMatchesResponse,
          historyResponse,
          privatePersonsResponse,
          profileResponse,
          currentPlanResponse,
          parameterResponse,
          userMatchesResponse,
          connectionsResponse,
          receivedConnectionsResponse,
        ] = await Promise.all([
          compatibilityService.topMatches(),
          compatibilityService.history(),
          privatePersonsService.list(),
          profileService.getMe(),
          planService.getCurrent(),
          planService.getParameters(),
          userMatchService.list().catch(() => {
            setUserMatchesLoadError("Unable to load user matches right now.");
            return null;
          }),
          connectionService.list().catch(() => {
            setConnectionsLoadError("Unable to load connections right now.");
            return null;
          }),
          connectionService.received().catch(() => {
            setConnectionsLoadError("Unable to load connection requests right now.");
            return null;
          }),
        ]);

        const nextPrivatePersons = privatePersonsResponse.results ?? [];
        const nextProfile = profileResponse.results?.[0] ?? null;

        setTopMatches(normalizeCompatibilityResults(topMatchesResponse));
        setHistory(normalizeCompatibilityResults(historyResponse));
        setPrivatePersons(nextPrivatePersons);
        setProfile(nextProfile);
        setCredits(currentPlanResponse.credits ?? 0);
        setParameters(normalizePlanParameters(parameterResponse.parameters));
        setUserMatches(userMatchesResponse?.results ?? []);
        setConnections(
          withDefaultConnectionStatus(connectionsResponse?.results ?? [], "accepted"),
        );
        setReceivedConnectionRequests(
          withDefaultConnectionStatus(
            receivedConnectionsResponse?.results ?? [],
            "pending",
          ),
        );

        if (nextPrivatePersons[0]?.id) {
          setSelectedPersonId(String(nextPrivatePersons[0].id));
        }
      } catch {
        setLoadError("Unable to load your compatibility workspace right now.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [setCredits, setParameters, token]);

  const selectedPerson = useMemo(
    () => privatePersons.find((person) => String(person.id) === selectedPersonId) ?? null,
    [privatePersons, selectedPersonId],
  );

  const previewResult = topMatches[0] ?? history[0] ?? null;
  const topUserMatches = useMemo(
    () =>
      [...userMatches]
        .sort((first, second) => {
          if (first.rank !== second.rank) {
            return first.rank - second.rank;
          }

          return second.score - first.score;
        })
        .slice(0, 3),
    [userMatches],
  );
  const pendingReceivedConnectionRequests = useMemo(
    () =>
      receivedConnectionRequests.filter((connection) => connection.status !== "accepted"),
    [receivedConnectionRequests],
  );
  const visiblePreviewParameters = useMemo(() => {
    if (!previewResult) {
      return [];
    }

    return previewResult.parameters
      .filter((parameter) => !shouldBlurParameter(parameter, parameters))
      .slice(0, 2);
  }, [parameters, previewResult]);
  const premiumPreviewParameters = useMemo(() => {
    if (!previewResult) {
      return [];
    }

    const locked = previewResult.parameters.filter((parameter) =>
      shouldBlurParameter(parameter, parameters),
    );

    if (locked.length > 0) {
      return locked.slice(0, 3);
    }

    return previewResult.parameters.slice(2, 5);
  }, [parameters, previewResult]);

  const greetingName = user?.username || user?.email || "Welcome back";

  const refreshConnections = async () => {
    const [connectionsResponse, receivedConnectionsResponse] = await Promise.all([
      connectionService.list(),
      connectionService.received(),
    ]);

    setConnections(withDefaultConnectionStatus(connectionsResponse.results ?? [], "accepted"));
    setReceivedConnectionRequests(
      withDefaultConnectionStatus(receivedConnectionsResponse.results ?? [], "pending"),
    );
  };

  const handleRunCompatibility = async () => {
    if (!profile?.id) {
      router.push("/profile");
      return;
    }

    if (!selectedPersonId) {
      router.push("/private-persons");
      return;
    }

    try {
      setIsRunningCheck(true);
      setActionError(null);
      setActionMessage(null);

      const response = await compatibilityService.calculate({
        matched_private_person_id: selectedPersonId,
      });

      const normalizedResults = normalizeCompatibilityResults(response, {
        [selectedPersonId]: selectedPerson?.name ?? "Selected match",
      });

      setResults(normalizedResults);
      router.push("/results");
    } catch (error) {
      setActionError(
        extractActionErrorMessage(error, "Compatibility check failed. Please try again."),
      );
    } finally {
      setIsRunningCheck(false);
    }
  };

  const handlePurchaseCredits = async (creditAmount: number) => {
    try {
      setIsPurchasingCredits(creditAmount);
      setActionError(null);
      setActionMessage(null);

      const purchaseResponse = await planService.purchase({
        credits: creditAmount,
        payment_reference: createPaymentReference(creditAmount),
      });

      if (typeof purchaseResponse.credits === "number") {
        setCredits(purchaseResponse.credits);
      } else {
        const refreshedPlan = await planService.getCurrent();
        setCredits(refreshedPlan.credits ?? 0);
      }

      setActionMessage(`${creditAmount} credits added to your account.`);
    } catch {
      setActionError("Unable to purchase credits right now.");
    } finally {
      setIsPurchasingCredits(null);
    }
  };

  const handleConnectionRequest = async (matchedUser: UserProfile) => {
    const matchedProfileId = matchedUser.id;

    try {
      setPendingConnectionAction(`request-${matchedProfileId}`);
      setActionError(null);
      setActionMessage(null);

      await connectionService.request(matchedProfileId);
      await refreshConnections();
      setActionMessage("Connection request sent.");
    } catch (error) {
      setActionError(
        extractActionErrorMessage(error, "Unable to send connection request right now."),
      );
    } finally {
      setPendingConnectionAction(null);
    }
  };

  const handleConnectionAction = async (
    connection: Connection,
    action: "accept" | "decline" | "cancel" | "disconnect",
  ) => {
    try {
      setPendingConnectionAction(`${action}-${connection.id}`);
      setActionError(null);
      setActionMessage(null);

      await connectionService[action](connection.id);
      await refreshConnections();
      setActionMessage(
        action === "accept"
          ? "Connection request accepted."
          : action === "decline"
            ? "Connection request declined."
            : action === "cancel"
              ? "Connection request cancelled."
              : "Connection disconnected.",
      );
    } catch (error) {
      setActionError(
        extractActionErrorMessage(error, "Unable to update connection right now."),
      );
    } finally {
      setPendingConnectionAction(null);
    }
  };

  if (!token) {
    return <PublicLandingPage />;
  }

  return (
    <HomeShell
      actions={
        <>
          <MiniActionLink href="/dashboard">Dashboard</MiniActionLink>
          <MiniActionLink href="/connections" badge={totalUnreadCount}>
            Connections
          </MiniActionLink>
          <LogoutButton />
        </>
      }
    >
      <Surface className="overflow-hidden">
          <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr] xl:items-end">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#eabfb9]">
                Personalized Action Zone
              </p>
              <h1 className="mt-5 max-w-3xl font-display text-5xl font-semibold tracking-tight text-white sm:text-6xl">
                {greetingName === "Welcome back"
                  ? "Check compatibility while the signal is fresh."
                  : `${greetingName}, check compatibility while the signal is fresh.`}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[#eabfb9]">
                Get your compatibility score instantly, surface the strongest signals first,
                and move straight into deeper insights when the match looks promising.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  className="rounded-full border-0 bg-[linear-gradient(135deg,#c07771_0%,#f5d5c8_100%)] px-7 py-4 text-base font-semibold text-[#0c0d0a] hover:bg-[linear-gradient(135deg,#eabfb9_0%,#f5d5c8_100%)]"
                  disabled={isRunningCheck || isLoading}
                  onClick={handleRunCompatibility}
                >
                  {profile && selectedPerson
                    ? isRunningCheck
                      ? "Running compatibility..."
                      : "Check Compatibility Now"
                    : profile
                      ? "Choose a partner to start"
                      : "Set up your profile first"}
                </Button>
                <MiniActionLink href="/compatibility">Open advanced compatibility</MiniActionLink>
              </div>

              {actionError ? (
                <div className="mt-4 rounded-2xl border border-[#a22e34]/35 bg-[#901214]/15 px-4 py-3 text-sm text-[#f5d5c8]">
                  {actionError}
                </div>
              ) : null}
              {actionMessage ? (
                <div className="mt-4 rounded-2xl border border-[#eabfb9]/25 bg-[#eabfb9]/10 px-4 py-3 text-sm text-[#eabfb9]">
                  {actionMessage}
                </div>
              ) : null}
              {loadError ? (
                <div className="mt-4 rounded-2xl border border-[#a22e34]/35 bg-[#901214]/15 px-4 py-3 text-sm text-[#f5d5c8]">
                  {loadError}
                </div>
              ) : null}
            </div>

            <div className="rounded-[1.75rem] border border-[#eabfb9]/20 bg-[linear-gradient(180deg,rgba(162,46,52,0.35)_0%,rgba(12,13,10,0.74)_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Quick run</p>
                <span className="rounded-full border border-[#f5d5c8]/25 bg-[#f5d5c8]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f5d5c8]">
                  Instant Score
                </span>
              </div>

              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b2806b]">
                    Your profile
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {profile ? "Ready for comparison" : "Missing required profile"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#eabfb9]">
                    {profile
                      ? `${profile.date_of_birth} at ${profile.time_of_birth} • ${profile.place_of_birth}`
                      : "Create your birth profile before running direct compatibility checks."}
                  </p>
                  {!profile ? (
                    <div className="mt-4">
                      <MiniActionLink href="/profile">Create profile</MiniActionLink>
                    </div>
                  ) : null}
                </div>

                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b2806b]">
                    Select partner
                  </span>
                  <select
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0c0d0a]/70 px-4 py-3 text-sm text-white outline-none transition focus:border-[#eabfb9]"
                    disabled={privatePersons.length === 0 || isLoading}
                    value={selectedPersonId}
                    onChange={(event) => setSelectedPersonId(event.target.value)}
                  >
                    {privatePersons.length === 0 ? (
                      <option value="">No saved private persons</option>
                    ) : null}
                    {privatePersons.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedPerson ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b2806b]">
                      Selected match
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">{selectedPerson.name}</p>
                    <p className="mt-2 text-sm leading-6 text-[#eabfb9]">
                      {selectedPerson.date_of_birth}
                      {selectedPerson.time_of_birth ? ` at ${selectedPerson.time_of_birth}` : ""}
                      {selectedPerson.place_of_birth
                        ? ` • ${selectedPerson.place_of_birth}`
                        : ""}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/12 bg-white/5 p-4 text-sm leading-6 text-[#eabfb9]">
                    Add a private person to reduce friction and start checking compatibility
                    from the homepage.
                    <div className="mt-4">
                      <MiniActionLink href="/private-persons">Add private person</MiniActionLink>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Surface>

      <Surface>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#eabfb9]">
              Suggested Match for you
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-white/12 bg-white/5 p-5 text-sm text-[#eabfb9] md:col-span-3">
              Loading user matches...
            </div>
          ) : userMatchesLoadError ? (
            <div className="rounded-2xl border border-[#a22e34]/35 bg-[#901214]/15 p-5 text-sm text-[#f5d5c8] md:col-span-3">
              {userMatchesLoadError}
            </div>
          ) : topUserMatches.length > 0 ? (
            topUserMatches.map((match) => {
              const matchedUser = match.matched_user;
              const matchedProfileId = matchedUser.id;
              const imageUrl = matchedUser.profile_picture ?? matchedUser.user?.profile_picture;
              const receivedConnection = getConnectionForProfile(
                receivedConnectionRequests,
                matchedProfileId,
              );
              const existingConnection =
                receivedConnection ?? getConnectionForProfile(connections, matchedProfileId);
              const isAcceptedConnection = existingConnection?.status === "accepted";
              const isPendingConnection = existingConnection?.status === "pending";
              const isReceivedPendingConnection =
                receivedConnection?.status === "pending" ||
                (existingConnection?.receiver?.id === profile?.id && isPendingConnection);

              return (
                <div
                  key={match.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {imageUrl ? (
                        <img
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-full border border-[#eabfb9]/20 object-cover"
                          src={imageUrl}
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#eabfb9]/20 bg-[#f5d5c8]/10 text-sm font-semibold text-[#f5d5c8]">
                          {getProfileInitials(matchedUser)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-white">
                          {getProfileDisplayName(matchedUser)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 space-y-2 text-sm leading-6 text-[#eabfb9]">
                    {matchedUser.gender ? <p>{matchedUser.gender}</p> : null}
                    {matchedUser.date_of_birth ? <p>{matchedUser.date_of_birth}</p> : null}
                    {matchedUser.place_of_birth ? <p>{matchedUser.place_of_birth}</p> : null}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {isAcceptedConnection && existingConnection ? (
                      <>
                        <span className="inline-flex items-center rounded-full border border-[#eabfb9]/20 bg-[#eabfb9]/10 px-3 py-2 text-xs font-semibold text-[#f5d5c8]">
                          Connected
                        </span>
                        <Button
                          className="px-4 py-2 text-xs"
                          disabled={
                            pendingConnectionAction === `disconnect-${existingConnection.id}`
                          }
                          variant="ghost"
                          onClick={() => handleConnectionAction(existingConnection, "disconnect")}
                        >
                          {pendingConnectionAction === `disconnect-${existingConnection.id}`
                            ? "Disconnecting..."
                            : "Disconnect"}
                        </Button>
                      </>
                    ) : isReceivedPendingConnection && existingConnection ? (
                      <>
                        <Button
                          className="px-4 py-2 text-xs"
                          disabled={pendingConnectionAction === `accept-${existingConnection.id}`}
                          onClick={() => handleConnectionAction(existingConnection, "accept")}
                        >
                          {pendingConnectionAction === `accept-${existingConnection.id}`
                            ? "Accepting..."
                            : "Accept"}
                        </Button>
                        <Button
                          className="px-4 py-2 text-xs"
                          disabled={pendingConnectionAction === `decline-${existingConnection.id}`}
                          variant="ghost"
                          onClick={() => handleConnectionAction(existingConnection, "decline")}
                        >
                          {pendingConnectionAction === `decline-${existingConnection.id}`
                            ? "Declining..."
                            : "Decline"}
                        </Button>
                      </>
                    ) : isPendingConnection && existingConnection ? (
                      <Button
                        className="px-4 py-2 text-xs"
                        disabled={pendingConnectionAction === `cancel-${existingConnection.id}`}
                        variant="ghost"
                        onClick={() => handleConnectionAction(existingConnection, "cancel")}
                      >
                        {pendingConnectionAction === `cancel-${existingConnection.id}`
                          ? "Cancelling..."
                          : "Request Sent"}
                      </Button>
                    ) : (
                      <Button
                        className="px-4 py-2 text-xs"
                        disabled={
                          Boolean(connectionsLoadError) ||
                          pendingConnectionAction === `request-${matchedProfileId}`
                        }
                        onClick={() => handleConnectionRequest(matchedUser)}
                      >
                        {connectionsLoadError
                          ? "Unavailable"
                          : pendingConnectionAction === `request-${matchedProfileId}`
                          ? "Connecting..."
                          : "Connect"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-white/12 bg-white/5 p-5 text-sm leading-7 text-[#eabfb9] md:col-span-3">
              UserMatch records will appear here once the API returns matched users.
            </div>
          )}
        </div>
      </Surface>

      <Surface>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#eabfb9]">
              Connection Requests
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-white/12 bg-white/5 p-5 text-sm text-[#eabfb9]">
              Loading connection requests...
            </div>
          ) : connectionsLoadError ? (
            <div className="rounded-2xl border border-[#a22e34]/35 bg-[#901214]/15 p-5 text-sm text-[#f5d5c8]">
              {connectionsLoadError}
            </div>
          ) : pendingReceivedConnectionRequests.length > 0 ? (
            pendingReceivedConnectionRequests.map((connection) => {
              const peer = getConnectionPeer(connection, profile?.id);

              return (
                <div
                  key={connection.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div>
                    <p className="text-base font-semibold text-white">
                      {getProfileDisplayName(peer)}
                    </p>
                    {peer.place_of_birth ? (
                      <p className="mt-2 text-sm text-[#eabfb9]">{peer.place_of_birth}</p>
                    ) : null}
                    <p className="mt-2 text-sm text-[#eabfb9]">
                      Sent {formatTimestamp(connection.requested_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="px-4 py-2 text-xs"
                      disabled={pendingConnectionAction === `accept-${connection.id}`}
                      onClick={() => handleConnectionAction(connection, "accept")}
                    >
                      {pendingConnectionAction === `accept-${connection.id}`
                        ? "Accepting..."
                        : "Accept"}
                    </Button>
                    <Button
                      className="px-4 py-2 text-xs"
                      disabled={pendingConnectionAction === `decline-${connection.id}`}
                      variant="ghost"
                      onClick={() => handleConnectionAction(connection, "decline")}
                    >
                      {pendingConnectionAction === `decline-${connection.id}`
                        ? "Declining..."
                        : "Decline"}
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-white/12 bg-white/5 p-5 text-sm leading-7 text-[#eabfb9]">
              No pending connection requests.
            </div>
          )}
        </div>
      </Surface>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_0.85fr]">
        <Surface>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#eabfb9]">
                Instant Value Preview
              </p>
              <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-white">
                See partial value before you go deeper.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#eabfb9]">
                Surface the score and a couple of free signals immediately, then use the
                deeper layers to create curiosity and trigger the next action.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="mt-8 rounded-[1.75rem] border border-dashed border-white/12 bg-white/5 p-8 text-sm text-[#eabfb9]">
              Loading compatibility preview...
            </div>
          ) : previewResult ? (
            <div className="mt-8 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
              <div className="rounded-[1.75rem] border border-[#eabfb9]/20 bg-[linear-gradient(180deg,rgba(162,46,52,0.4)_0%,rgba(12,13,10,0.74)_100%)] p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#eabfb9]">
                  Sample Compatibility
                </p>
                <p className="mt-4 text-sm text-[#eabfb9]">{previewResult.personName}</p>
                <CompatibilityScoreLine
                  className="mt-6"
                  label="Compatibility Score"
                  score={previewResult.score}
                  tone="dark"
                />
                <p className="mt-5 text-sm leading-7 text-[#eabfb9]">
                  {previewResult.summary ?? "This result already indicates enough signal to justify a deeper review."}
                </p>
                <p className="mt-6 text-xs uppercase tracking-[0.24em] text-[#b2806b]/80">
                  {formatTimestamp(previewResult.createdAt)}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {visiblePreviewParameters.length > 0 ? (
                  visiblePreviewParameters.map((parameter) => (
                    <div
                      key={parameter.key}
                      className="rounded-2xl border border-white/10 bg-white/5 p-5"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#eabfb9]">
                        Visible Insight
                      </p>
                      <p className="mt-3 text-sm font-medium text-white">{parameter.label}</p>
                      <p className="mt-3 text-sm leading-7 text-[#eabfb9]">{parameter.value}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/12 bg-white/5 p-5 text-sm leading-7 text-[#eabfb9] md:col-span-2">
                    The selected result does not contain parameter breakdowns yet.
                  </div>
                )}

                {premiumPreviewParameters.map((parameter) => (
                  <LockedInsightCard
                    key={`locked-${parameter.key}`}
                    cta="Unlock deeper insights"
                    label={parameter.label}
                    value={parameter.value}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-8 rounded-[1.75rem] border border-dashed border-white/12 bg-white/5 p-8 text-sm leading-7 text-[#eabfb9]">
              No compatibility results are available yet. Run your first check to turn this
              section into a conversion preview.
            </div>
          )}
        </Surface>

        <Surface>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f5d5c8]">
            Paywall Nudge
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-white">
            See the full picture before making decisions.
          </h2>
          <p className="mt-4 text-sm leading-7 text-[#eabfb9]">
            High-level scores help you rank matches. Premium layers help you understand why
            the signal looks strong, weak, or complicated.
          </p>

          <div className="mt-6 space-y-3">
            {premiumPreviewParameters.length > 0 ? (
              premiumPreviewParameters.map((parameter) => (
                <div
                  key={`nudge-${parameter.key}`}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
                >
                  <p className="text-sm font-medium text-white">{parameter.label}</p>
                  <p className="mt-2 select-none text-sm text-[#eabfb9] blur-sm">
                    {parameter.value}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/12 bg-white/5 px-4 py-4 text-sm leading-7 text-[#eabfb9]">
                Premium preview cards appear here once the API returns parameter-rich
                compatibility results.
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              className="rounded-full border-0 bg-[linear-gradient(135deg,#c07771_0%,#f5d5c8_100%)] px-6 text-[#0c0d0a] hover:bg-[linear-gradient(135deg,#eabfb9_0%,#f5d5c8_100%)]"
              disabled={isPurchasingCredits !== null}
              onClick={() => handlePurchaseCredits(15)}
            >
              {isPurchasingCredits === 15 ? "Processing..." : "Buy Credits"}
            </Button>
          </div>
        </Surface>
      </div>

    </HomeShell>
  );
}
