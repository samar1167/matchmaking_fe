"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { compatibilityService } from "@/services/compatibilityService";
import { normalizeCompatibilityResults } from "@/services/compatibilityMapper";
import { planService } from "@/services/planService";
import { privatePersonsService } from "@/services/privatePersonsService";
import { useAuthStore } from "@/store/authStore";
import type { StoredCompatibilityResult } from "@/store/resultsStore";
import type { PlanMeResponse } from "@/types/plan";
import type { PrivatePerson } from "@/types/private-persons";

const formatDate = (value?: string) => {
  if (!value) {
    return "Not available";
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

function DashboardLogo() {
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

function DashboardAction({
  children,
  href,
  active = false,
  onClick,
  variant = "secondary",
}: {
  children: ReactNode;
  href?: string;
  active?: boolean;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}) {
  const className =
    variant === "primary"
      ? "inline-flex min-h-11 items-center justify-center rounded-md bg-[#901214] px-5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(144,18,20,0.14)] transition hover:bg-[#961116]"
      : `inline-flex min-h-11 items-center justify-center rounded-md border px-5 text-sm font-bold transition ${
          active
            ? "border-[#901214] bg-[#fdf1f0] text-[#901214]"
            : "border-[#C07771] bg-[#fafafa] text-[#901214] hover:border-[#901214]"
        }`;

  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button
      aria-pressed={active}
      className={className}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function DashboardAlert({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-[#EABFB9] bg-[#fdf1f0] px-4 py-3 text-sm font-semibold text-[#901214]">
      {children}
    </div>
  );
}

function DashboardEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-[#C07771] bg-[#fffafa] p-6 text-sm leading-6 text-[#2d1718]/65">
      {children}
    </div>
  );
}

function DashboardIllustration() {
  return (
    <div className="relative hidden min-h-56 overflow-hidden rounded-r-xl lg:block">
      <div className="absolute bottom-0 left-12 h-32 w-24 rounded-t-full bg-[#C07771]" />
      <div className="absolute bottom-0 left-44 h-40 w-28 rounded-t-full bg-[#B2806B]" />
      <div className="absolute bottom-28 left-16 h-14 w-14 rounded-full bg-[#EABFB9]" />
      <div className="absolute bottom-36 left-48 h-14 w-14 rounded-full bg-[#EABFB9]" />
      <div className="absolute bottom-0 left-4 h-24 w-64 rounded-t-full bg-[#EABFB9]/55" />
      <div className="absolute bottom-8 right-12 h-24 w-28 rounded-t-full border-l-8 border-[#C07771]/45" />
    </div>
  );
}

function DashboardAvatar({ label }: { label: string }) {
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#C07771] bg-[#EABFB9] text-sm font-bold text-[#901214]">
      {label
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "LU"}
    </div>
  );
}

const getScoreTone = (score: number) => {
  if (score >= 80) {
    return "text-[#1f7a3f]";
  }

  if (score >= 60) {
    return "text-[#c85f1a]";
  }

  return "text-[#A22E34]";
};

const getMatchLabel = (score: number) => {
  if (score >= 85) {
    return "Highly Compatible";
  }

  if (score >= 70) {
    return "High Compatibility";
  }

  if (score >= 55) {
    return "Moderate Match";
  }

  return "Low Match";
};

function RecentAnalysisRow({ result }: { result: StoredCompatibilityResult }) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 border-b border-[#EABFB9] py-4 last:border-b-0">
      <DashboardAvatar label={result.personName} />
      <div>
        <p className="text-sm font-bold text-[#2d1718]">You & {result.personName}</p>
        <p className="mt-1 text-xs text-[#2d1718]/65">
          Analysed on {formatDate(result.createdAt).split(",")[0]}
        </p>
      </div>
      <div className="text-right">
        <p className={`font-display text-3xl font-bold ${getScoreTone(result.score)}`}>
          {Math.round(result.score)}%
        </p>
        <p className="text-xs font-semibold text-[#2d1718]/65">{getMatchLabel(result.score)}</p>
      </div>
      <DashboardAction href="/results">View Report</DashboardAction>
    </div>
  );
}

function ProfileSnapshot() {
  const profileRows = [
    ["♡", "Long-term Orientation", "High", 84],
    ["♨", "Emotional Needs", "Medium-High", 66],
    ["▦", "Conflict Style", "Direct", 78],
    ["≈", "Communication Style", "Expressive", 74],
    ["♧", "Lifestyle Flexibility", "Medium", 62],
  ];

  return (
    <DashboardPanel title="Your Profile Snapshot" action="View full profile" actionHref="/profile">
      <div className="space-y-5">
        {profileRows.map(([icon, label, value, width]) => (
          <div key={label} className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fdf1f0] text-[#A22E34]">
              {icon}
            </span>
            <div>
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-[#2d1718]">{label}</p>
                <p className="text-sm text-[#2d1718]">{value}</p>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#EABFB9]">
                <div
                  className="h-full rounded-full bg-[#A22E34]"
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-[#EABFB9] bg-[#fdf1f0] p-5">
        <p className="text-sm font-bold text-[#901214]">Your Insight</p>
        <p className="mt-2 text-sm leading-6 text-[#2d1718]/78">
          You value deep emotional connection and honesty. You match best with
          partners who are emotionally expressive and share similar long-term goals.
        </p>
        <Link href="/profile" className="mt-4 inline-flex text-sm font-bold text-[#901214]">
          View Full Profile →
        </Link>
      </div>
    </DashboardPanel>
  );
}

function DashboardPanel({
  title,
  action,
  actionHref = "/results",
  children,
}: {
  title: string;
  action?: string;
  actionHref?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#EABFB9] bg-[#fafafa] p-6 shadow-[0_10px_24px_rgba(144,18,20,0.05)]">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-bold text-[#2d1718]">{title}</h2>
        {action ? (
          <Link href={actionHref} className="text-sm font-bold text-[#901214]">
            {action}
          </Link>
        ) : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function TopCompatibleRow({
  result,
  index,
}: {
  result: StoredCompatibilityResult;
  index: number;
}) {
  const insights = [
    ["Strong emotional alignment", "Similar long-term goals", "Slight lifestyle differences"],
    ["High long-term potential", "Good communication fit", "Moderate conflict style gap"],
    ["Emotional connection", "Different lifestyle pace", "Values align well"],
  ][index % 3];

  return (
    <div className="grid grid-cols-[auto_1fr_auto_1.1fr_auto] items-center gap-5 border-b border-[#EABFB9] py-4 last:border-b-0">
      <DashboardAvatar label={result.personName} />
      <div>
        <p className="text-sm font-bold text-[#2d1718]">{result.personName}</p>
        <p className="mt-1 text-xs text-[#2d1718]/65">Compatibility profile</p>
      </div>
      <div className="text-center">
        <p className={`font-display text-3xl font-bold ${getScoreTone(result.score)}`}>
          {Math.round(result.score)}%
        </p>
        <p className="text-xs font-semibold text-[#c85f1a]">{getMatchLabel(result.score)}</p>
      </div>
      <div className="space-y-1 text-xs text-[#2d1718]/72">
        {insights.map((insight, insightIndex) => (
          <p key={insight} className="flex items-center gap-2">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                insightIndex === 2 ? "bg-[#d6a11d]" : "bg-[#1f7a3f]"
              }`}
            />
            {insight}
          </p>
        ))}
      </div>
      <Link
        href="/results"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fdf1f0] text-xl font-bold text-[#901214]"
      >
        ›
      </Link>
    </div>
  );
}

export function DashboardOverview() {
  const user = useAuthStore((state) => state.user);
  const { credits, parameters } = usePlanAccess();
  const [history, setHistory] = useState<StoredCompatibilityResult[]>([]);
  const [topMatches, setTopMatches] = useState<StoredCompatibilityResult[]>([]);
  const [privatePersons, setPrivatePersons] = useState<PrivatePerson[]>([]);
  const [planSummary, setPlanSummary] = useState<PlanMeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [
          historyResponse,
          topMatchesResponse,
          privatePersonsResponse,
          planResponse,
        ] = await Promise.allSettled([
          compatibilityService.history(),
          compatibilityService.topMatches(),
          privatePersonsService.list(),
          planService.getCurrent(),
        ]);

        if (historyResponse.status === "fulfilled") {
          setHistory(normalizeCompatibilityResults(historyResponse.value));
        }

        if (topMatchesResponse.status === "fulfilled") {
          setTopMatches(normalizeCompatibilityResults(topMatchesResponse.value));
        }

        if (privatePersonsResponse.status === "fulfilled") {
          setPrivatePersons(privatePersonsResponse.value.results ?? []);
        }

        if (planResponse.status === "fulfilled") {
          setPlanSummary(planResponse.value);
        }

        if (
          historyResponse.status === "rejected" &&
          topMatchesResponse.status === "rejected" &&
          privatePersonsResponse.status === "rejected" &&
          planResponse.status === "rejected"
        ) {
          setError("Unable to load dashboard insights right now.");
        }
      } catch {
        setError("Unable to load dashboard insights right now.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const strongestMatch = topMatches[0] ?? null;
  const availableCredits = planSummary?.credits ?? credits;

  const unlockedParameters = useMemo(
    () => Object.values(parameters).filter((item) => item.free).length,
    [parameters],
  );
  const premiumParameters = useMemo(
    () => Object.values(parameters).filter((item) => item.paid && !item.free).length,
    [parameters],
  );

  const displayName = user?.username || user?.first_name || user?.email || "Samar";
  const recentAnalyses = history.slice(0, 3);
  const topCompatiblePeople = (topMatches.length > 0 ? topMatches : history).slice(0, 3);
  const matchesFound = topMatches.length || history.filter((result) => result.score >= 70).length;

  return (
    <main className="min-h-screen bg-[#fffafa] text-[#2d1718]">
      <div className="mx-auto max-w-7xl px-8 py-8">
        {error ? <DashboardAlert>{error}</DashboardAlert> : null}

        <section className="grid overflow-hidden rounded-xl border border-[#EABFB9] bg-[#fdf1f0] lg:grid-cols-[1fr_0.95fr]">
          <div className="p-10">
            <h1 className="font-display text-5xl font-bold leading-tight text-[#2d1718]">
              Welcome back, {displayName} 👋
            </h1>
            <p className="mt-4 max-w-md text-lg leading-8 text-[#2d1718]/76">
              You’re one step closer to building stronger, more meaningful relationships.
            </p>
            <div className="mt-7 flex flex-wrap gap-5">
              <DashboardAction href="/compatibility" variant="primary">
                Check Compatibility →
              </DashboardAction>
              <DashboardAction href="/top-scores">Find Matches →</DashboardAction>
            </div>
          </div>
          <DashboardIllustration />
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.9fr)]">
          <div className="grid gap-6">
            <DashboardPanel title="Your Recent Analyses" action="View all">
              {isLoading ? (
                <DashboardEmpty>Loading recent analyses...</DashboardEmpty>
              ) : recentAnalyses.length > 0 ? (
                recentAnalyses.map((result) => (
                  <RecentAnalysisRow key={result.id} result={result} />
                ))
              ) : (
                <DashboardEmpty>No analyses yet. Run a compatibility check to begin.</DashboardEmpty>
              )}
            </DashboardPanel>

            <DashboardPanel title="Recommended For You">
              <div className="space-y-4">
                {[
                  `You have ${matchesFound} high compatibility match${matchesFound === 1 ? "" : "es"}.`,
                  strongestMatch
                    ? `One strong long-term alignment detected with ${strongestMatch.personName}.`
                    : "Add more private users to improve your match recommendations.",
                  history.some((result) => result.score < 55)
                    ? "Consider reviewing your recent low match."
                    : "Review your recent report archive for useful patterns.",
                  "Improve communication to strengthen relationship outcomes.",
                ].map((item, index) => (
                  <p key={item} className="flex items-center gap-4 text-sm text-[#2d1718]">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fdf1f0] text-[#A22E34]">
                      {["☆", "♡", "↗", "☵"][index]}
                    </span>
                    {item}
                  </p>
                ))}
              </div>
              <div className="mt-6">
                <DashboardAction href="/top-scores" variant="primary">
                  View Matches →
                </DashboardAction>
              </div>
            </DashboardPanel>

            <DashboardPanel title="Top Compatible People For You" action="View all">
              {isLoading ? (
                <DashboardEmpty>Loading compatible people...</DashboardEmpty>
              ) : topCompatiblePeople.length > 0 ? (
                topCompatiblePeople.map((result, index) => (
                  <TopCompatibleRow key={result.id} result={result} index={index} />
                ))
              ) : (
                <DashboardEmpty>No compatible people are available yet.</DashboardEmpty>
              )}
            </DashboardPanel>
          </div>

          <div className="grid content-start gap-6">
            <ProfileSnapshot />

            <DashboardPanel title="Quick Stats">
              <div className="divide-y divide-[#EABFB9]">
                {[
                  ["▣", "Analyses Done", history.length],
                  ["♡", "Matches Found", matchesFound],
                  ["♙", "Connections", privatePersons.length],
                  ["▤", "Reports Unlocked", unlockedParameters + premiumParameters],
                ].map(([icon, label, value]) => (
                  <div key={label} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-4">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fdf1f0] text-[#A22E34]">
                        {icon}
                      </span>
                      <p className="text-sm font-semibold text-[#2d1718]">{label}</p>
                    </div>
                    <p className="text-sm font-bold text-[#2d1718]">{value}</p>
                  </div>
                ))}
              </div>
            </DashboardPanel>

            <DashboardPanel title="What’s New">
              <div className="space-y-5">
                <Link href="/results" className="flex items-center justify-between gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#fdf1f0] text-2xl text-[#A22E34]">
                    ▣
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-bold text-[#2d1718]">New Insight Feature</span>
                    <span className="text-xs text-[#2d1718]/65">Get deeper insights into your compatibility.</span>
                  </span>
                  <span className="text-2xl text-[#2d1718]">›</span>
                </Link>
                <Link href="/top-scores" className="flex items-center justify-between gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#fdf1f0] text-2xl text-[#A22E34]">
                    ✣
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-bold text-[#2d1718]">Improved Matching</span>
                    <span className="text-xs text-[#2d1718]/65">Better matches based on your feedback.</span>
                  </span>
                  <span className="text-2xl text-[#2d1718]">›</span>
                </Link>
              </div>
              <Link href="/results" className="mt-5 inline-flex text-sm font-bold text-[#901214]">
                See All Updates →
              </Link>
            </DashboardPanel>
          </div>
        </div>

        <section className="mt-8 flex flex-col items-center justify-between gap-6 overflow-hidden rounded-xl bg-[#A22E34] px-8 py-6 text-white md:flex-row">
          <div className="hidden text-7xl text-[#EABFB9]/70 md:block">♡</div>
          <div>
            <h2 className="font-display text-3xl font-bold">Don’t guess something this important.</h2>
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
        </section>
      </div>

      <footer className="border-t border-[#EABFB9] bg-[#fffafa] px-8 py-5">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
          <DashboardLogo />
          <div className="flex flex-wrap justify-center gap-8 text-sm text-[#2d1718]/70">
            {["About Us", "How It Works", "Privacy Policy", "Terms of Service", "Contact Us"].map((link) => (
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
