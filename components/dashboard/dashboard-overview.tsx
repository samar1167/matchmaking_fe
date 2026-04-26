"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";
import {
  CompatibilityScoreLine,
  getCompatibilityCategory,
  getScoreOnTen,
  isNumericCompatibilityValue,
} from "@/components/ui/compatibility-score";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { compatibilityService } from "@/services/compatibilityService";
import { normalizeCompatibilityResults } from "@/services/compatibilityMapper";
import { planService } from "@/services/planService";
import { privatePersonsService } from "@/services/privatePersonsService";
import { useAuthStore } from "@/store/authStore";
import type { StoredCompatibilityResult } from "@/store/resultsStore";
import type { PlanMeResponse, PlanParameters } from "@/types/plan";
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

const createPaymentReference = (credits: number) => {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `dashboard-${credits}-${Date.now()}-${suffix}`;
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

function DashboardLoadingCard() {
  return (
    <div className="animate-pulse rounded-xl border border-[#EABFB9] bg-[#fffafa] p-5">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-[#EABFB9]" />
        <div className="space-y-2">
          <div className="h-4 w-32 rounded-full bg-[#EABFB9]" />
          <div className="h-3 w-24 rounded-full bg-[#EABFB9]/80" />
        </div>
        <div className="h-8 w-20 rounded-full bg-[#EABFB9]" />
      </div>
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

function RecentAnalysisRow({
  onOpenDetails,
  result,
}: {
  onOpenDetails: () => void;
  result: StoredCompatibilityResult;
}) {
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
        <p className={`font-display text-2xl font-bold ${getScoreTone(result.score)}`}>
          {getCompatibilityCategory(result.score)}
        </p>
      </div>
      <ResultDetailsButton
        label={`View compatibility details for ${result.personName}`}
        onClick={onOpenDetails}
      />
    </div>
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

function LockedParameterValue({ value }: { value: string }) {
  return (
    <div className="relative isolate overflow-hidden rounded-lg border border-[rgba(144,18,20,0.12)] bg-[linear-gradient(135deg,rgba(144,18,20,0.94)_0%,rgba(127,83,62,0.96)_100%)] px-3 py-3 text-white">
      <span className="block select-none blur-md opacity-80">{value}</span>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,13,10,0.08)_0%,rgba(12,13,10,0.62)_100%)]" />
      <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 rounded-lg border border-[rgba(245,213,200,0.28)] bg-[rgba(12,13,10,0.72)] px-3 py-2 text-center backdrop-blur-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[rgba(245,213,200,0.98)]">
          Locked Insight
        </p>
      </div>
    </div>
  );
}

function CompatibilityDetailsDialog({
  onClose,
  parameters,
  result,
}: {
  onClose: () => void;
  parameters: PlanParameters;
  result: StoredCompatibilityResult;
}) {
  const hasLockedInsights = result.parameters.some((parameter) =>
    shouldBlurParameter(parameter, parameters),
  );
  const leftCircleLabel = "You";
  const rightCircleLabel = result.personName;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-[#2d1718]/50 px-4 py-6"
      role="dialog"
    >
      <div className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#EABFB9] bg-[#fafafa] p-6 shadow-[0_24px_80px_rgba(45,23,24,0.28)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-center text-xl font-bold tracking-tight text-[#2d1718]">
              Your Compatibility Snapshot
            </p>
          </div>
          <button
            aria-label="Close compatibility details"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#C07771] bg-[#fafafa] text-xl font-bold text-[#901214] transition hover:border-[#901214]"
            type="button"
            onClick={onClose}
          >
            x
          </button>
        </div>

        <div className="mt-5 flex items-center justify-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#C07771] bg-[#EABFB9] px-2 text-center text-xs font-bold leading-tight text-[#901214]">
            {leftCircleLabel}
          </div>
          <div className="flex min-w-40 flex-col items-center">
            <div className="flex w-full items-center gap-3">
              <span className="h-px flex-1 border-t border-dashed border-[#C07771]" />
              <span className="text-xl text-[#901214]">♥</span>
              <span className="h-px flex-1 border-t border-dashed border-[#C07771]" />
            </div>
            <p className="mt-2 text-sm font-bold text-[#2d1718]">
              You & {result.personName}
            </p>
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#C07771] bg-[#EABFB9] px-2 text-center text-[10px] font-bold leading-tight text-[#901214]">
            {rightCircleLabel}
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-[#EABFB9] bg-[#fffafa] p-4">
          <CompatibilityScoreLine label="Compatibility Score" score={result.score} />
        </div>

        {result.summary ? (
          <div className="mt-6 rounded-lg border border-[#EABFB9] bg-[#fdf1f0] p-4">
            <p className="text-sm font-bold text-[#901214]">Key Insight</p>
            <p className="mt-1 text-sm leading-6 text-[#2d1718]">{result.summary}</p>
          </div>
        ) : null}

        <div className="mt-6 grid gap-3.5 md:grid-cols-2">
          {result.parameters.length > 0 ? (
            result.parameters.map((parameter) => {
              const locked = shouldBlurParameter(parameter, parameters);
              const numericValue = Number(parameter.value);
              const numericScoreOnTen = getScoreOnTen(numericValue);
              const numericCategory = getCompatibilityCategory(numericValue);
              const showScoreLine =
                !locked && isNumericCompatibilityValue(parameter.value);

              return (
                <div
                  className="rounded-lg border border-[#EABFB9] bg-[#fffafa] p-4"
                  key={`${result.id}-${parameter.key}`}
                >
                  {showScoreLine ? (
                    <div className="grid grid-cols-[1fr_1.25fr_auto] items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#EABFB9] text-xs text-[#901214]">
                          ♥
                        </span>
                        <span className="text-xs font-semibold text-[#2d1718]">
                          {parameter.label}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#EABFB9]">
                        <div
                          className="h-full rounded-full bg-[#A22E34]"
                          style={{
                            width: `${Math.max(4, (numericScoreOnTen / 10) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="min-w-24 text-right text-xs font-bold text-[#2d1718]">
                        {numericCategory}
                      </span>
                    </div>
                  ) : (
                    <>
                      <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7F533E]">
                        {parameter.label}
                      </dt>
                      <dd className="mt-3 min-h-12 text-sm font-semibold leading-6 text-[#2d1718]">
                        {locked ? <LockedParameterValue value={parameter.value} /> : parameter.value}
                      </dd>
                    </>
                  )}
                </div>
              );
            })
          ) : (
            <div className="rounded-lg border border-dashed border-[#C07771] bg-[#fffafa] p-5 text-sm text-[#2d1718]/65 md:col-span-2">
              No compatibility parameters were returned for this user.
            </div>
          )}
        </div>

        {hasLockedInsights ? (
          <div className="mt-5 rounded-lg border border-[#EABFB9] bg-[#fffafa] px-4 py-4 text-sm leading-6 text-[#2d1718]/72">
            <p>Free plan locks Premium insights. Purchase Credits to unlock.</p>
            <Link
              className="mt-3 inline-flex min-h-10 items-center justify-center rounded-md bg-[#901214] px-4 text-sm font-bold text-white transition hover:bg-[#961116]"
              href="/dashboard#credits-access"
            >
              Purchase Credits
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ResultDetailsButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fdf1f0] text-xl font-bold text-[#901214]"
      type="button"
      onClick={onClick}
    >
      ›
    </button>
  );
}

function TopCompatibleRow({
  onOpenDetails,
  result,
}: {
  onOpenDetails: () => void;
  result: StoredCompatibilityResult;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-5 border-b border-[#EABFB9] py-4 last:border-b-0">
      <DashboardAvatar label={result.personName} />
      <div>
        <p className="text-sm font-bold text-[#2d1718]">{result.personName}</p>
        <p className="mt-1 text-xs text-[#2d1718]/65">Compatibility profile</p>
      </div>
      <div className="text-center">
        <p className={`font-display text-2xl font-bold ${getScoreTone(result.score)}`}>
          {getCompatibilityCategory(result.score)}
        </p>
      </div>
      <ResultDetailsButton
        label={`View compatibility details for ${result.personName}`}
        onClick={onOpenDetails}
      />
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
  const [selectedResult, setSelectedResult] = useState<StoredCompatibilityResult | null>(null);
  const [isPurchasingCredits, setIsPurchasingCredits] = useState(false);
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
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

  const displayName = user?.username || user?.first_name || user?.email || "Samar";
  const recentAnalyses = history.slice(0, 3);
  const topCompatiblePeople = (topMatches.length > 0 ? topMatches : history).slice(0, 3);
  const matchesFound = history.filter((result) => result.score >= 50).length;

  const handlePurchaseCredits = async () => {
    try {
      setIsPurchasingCredits(true);
      setPurchaseError(null);
      setPurchaseMessage(null);

      const purchaseResponse = await planService.purchase({
        credits: 10,
        payment_reference: createPaymentReference(10),
      });

      if (typeof purchaseResponse.credits === "number") {
        setPlanSummary((current) => ({
          ...(current ?? {}),
          credits: purchaseResponse.credits,
          total_credits: purchaseResponse.credits,
        }));
      } else {
        const refreshedPlan = await planService.getCurrent();
        setPlanSummary(refreshedPlan);
      }

      setPurchaseMessage("10 credits added to your account.");
    } catch {
      setPurchaseError("Unable to purchase credits right now.");
    } finally {
      setIsPurchasingCredits(false);
    }
  };

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
            <div className="mt-7 flex flex-wrap items-center justify-between gap-5">
              <div className="flex flex-wrap gap-5">
                <DashboardAction href="/private-persons" variant="primary">
                  <span className="text-white">Check Compatibility →</span>
                </DashboardAction>
                <DashboardAction href="/connections">Find Matches →</DashboardAction>
              </div>
              <DashboardAction href="/profile">My Profile</DashboardAction>
            </div>
          </div>
          <DashboardIllustration />
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.9fr)]">
          <div className="grid gap-6">
            <DashboardPanel
              title="Top Compatible People For You"
              action="View all"
              actionHref="/top-scores"
            >
              {isLoading ? (
                <div className="space-y-4">
                  <DashboardLoadingCard />
                  <DashboardLoadingCard />
                  <DashboardLoadingCard />
                </div>
              ) : topCompatiblePeople.length > 0 ? (
                topCompatiblePeople.map((result) => (
                  <TopCompatibleRow
                    key={result.id}
                    onOpenDetails={() => setSelectedResult(result)}
                    result={result}
                  />
                ))
              ) : (
                <DashboardEmpty>No compatible people are available yet.</DashboardEmpty>
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
            </DashboardPanel>

            <DashboardPanel title="Your Recent Analyses" action="View all" actionHref="/top-scores">
              {isLoading ? (
                <DashboardEmpty>Loading recent analyses...</DashboardEmpty>
              ) : recentAnalyses.length > 0 ? (
                recentAnalyses.map((result) => (
                  <RecentAnalysisRow
                    key={result.id}
                    onOpenDetails={() => setSelectedResult(result)}
                    result={result}
                  />
                ))
              ) : (
                <DashboardEmpty>No analyses yet. Run a compatibility check to begin.</DashboardEmpty>
              )}
            </DashboardPanel>
          </div>

          <div className="grid content-start gap-6">
            <DashboardPanel title="Quick Stats">
              <div className="divide-y divide-[#EABFB9]">
                {[
                  ["▣", "Analyses Done", history.length],
                  ["♡", "Strong Matches Found", matchesFound],
                  ["♙", "Connections", privatePersons.length],
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

            <section
              id="credits-access"
              className="rounded-xl border border-[#EABFB9] bg-[linear-gradient(145deg,#fdf1f0_0%,#fffafa_100%)] p-6 shadow-[0_10px_24px_rgba(144,18,20,0.05)]"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#A22E34]">
                Credit Access
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold text-[#2d1718]">
                Purchase Credits
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#2d1718]/72">
                Unlock premium compatibility insights and keep checking new matches without
                interruption.
              </p>
              <div className="mt-5 rounded-xl border border-[#EABFB9] bg-[#fafafa] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7F533E]">
                  Available Credits
                </p>
                <p className="mt-2 font-display text-4xl font-bold text-[#901214]">
                  {availableCredits}
                </p>
              </div>
              {purchaseError ? (
                <div className="mt-4 rounded-lg border border-[#EABFB9] bg-[#fafafa] px-4 py-3 text-sm font-semibold text-[#901214]">
                  {purchaseError}
                </div>
              ) : null}
              {purchaseMessage ? (
                <div className="mt-4 rounded-lg border border-[#EABFB9] bg-[#fafafa] px-4 py-3 text-sm font-semibold text-[#1f7a3f]">
                  {purchaseMessage}
                </div>
              ) : null}
              <button
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-[#901214] px-5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(144,18,20,0.14)] transition hover:bg-[#961116] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isPurchasingCredits}
                type="button"
                onClick={handlePurchaseCredits}
              >
                {isPurchasingCredits ? "Purchasing..." : "Buy 10 Credits"}
              </button>
              <Link
                href="/payment-history"
                className="mt-3 inline-flex min-h-11 items-center justify-center rounded-md border border-[#C07771] bg-[#fafafa] px-5 text-sm font-bold text-[#901214] transition hover:border-[#901214]"
              >
                Payment History
              </Link>
            </section>

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
              href="/private-persons"
              className="inline-flex min-h-12 items-center justify-center rounded-md bg-[#fafafa] px-12 text-sm font-bold text-[#0c0d0a]"
            >
              <span className="text-[#0c0d0a]">Check Compatibility Now →</span>
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

      {selectedResult ? (
        <CompatibilityDetailsDialog
          onClose={() => setSelectedResult(null)}
          parameters={parameters}
          result={selectedResult}
        />
      ) : null}
    </main>
  );
}
