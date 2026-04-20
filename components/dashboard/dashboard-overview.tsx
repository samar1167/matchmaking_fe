"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { AppScaffold } from "@/components/layout/app-scaffold";
import { ResultsBoard } from "@/components/results/results-board";
import { Button } from "@/components/ui/button";
import {
  ActionLink,
  AlertMessage,
  BodyText,
  EmptyState,
  MetricTile,
  designSystem,
} from "@/components/ui/design-system";
import { SectionCard } from "@/components/ui/section-card";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { compatibilityService } from "@/services/compatibilityService";
import { normalizeCompatibilityResults } from "@/services/compatibilityMapper";
import { planService } from "@/services/planService";
import { privatePersonsService } from "@/services/privatePersonsService";
import { usePlanStore } from "@/store/planStore";
import type { StoredCompatibilityResult } from "@/store/resultsStore";
import type { PaymentHistoryItem, PlanMeResponse } from "@/types/plan";
import type { PrivatePerson } from "@/types/private-persons";

const purchaseOptions = [5, 15, 30];

type DashboardPanel =
  | "private-users"
  | "top-matches"
  | "compatibility"
  | "history"
  | "profile"
  | "credits";

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
  const suffix =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : String(Date.now());

  return `dashboard-${credits}-${suffix}`;
};

function ActionTile({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <div className={`${designSystem.inset} flex h-full flex-col justify-between p-5`}>
      <div>
        <p className={designSystem.eyebrow}>{eyebrow}</p>
        <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-primary">
          {title}
        </h3>
        <BodyText className="mt-3 leading-6">{description}</BodyText>
      </div>
      <div className="mt-5">{action}</div>
    </div>
  );
}

export function DashboardOverview() {
  const activePanelRef = useRef<HTMLDivElement | null>(null);
  const { credits, parameters } = usePlanAccess();
  const setCredits = usePlanStore((state) => state.setCredits);
  const [history, setHistory] = useState<StoredCompatibilityResult[]>([]);
  const [topMatches, setTopMatches] = useState<StoredCompatibilityResult[]>([]);
  const [privatePersons, setPrivatePersons] = useState<PrivatePerson[]>([]);
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [planSummary, setPlanSummary] = useState<PlanMeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [isPurchasingCredits, setIsPurchasingCredits] = useState<number | null>(null);
  const [activeDashboardPanel, setActiveDashboardPanel] = useState<DashboardPanel | null>(null);

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
          paymentHistoryResponse,
        ] = await Promise.allSettled([
          compatibilityService.history(),
          compatibilityService.topMatches(),
          privatePersonsService.list(),
          planService.getCurrent(),
          planService.getPaymentHistory(),
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

        if (paymentHistoryResponse.status === "fulfilled") {
          setPayments(paymentHistoryResponse.value.payments ?? []);
        }

        if (
          historyResponse.status === "rejected" &&
          topMatchesResponse.status === "rejected" &&
          privatePersonsResponse.status === "rejected" &&
          planResponse.status === "rejected" &&
          paymentHistoryResponse.status === "rejected"
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

  const latestPrivatePerson = privatePersons[0] ?? null;
  const strongestMatch = topMatches[0] ?? null;
  const latestPayment = payments[0] ?? null;
  const availableCredits = planSummary?.credits ?? credits;
  const freeCredits = planSummary?.free_credits ?? 0;
  const paidCredits = planSummary?.paid_credits ?? Math.max(availableCredits - freeCredits, 0);

  const unlockedParameters = useMemo(
    () => Object.values(parameters).filter((item) => item.free).length,
    [parameters],
  );
  const premiumParameters = useMemo(
    () => Object.values(parameters).filter((item) => item.paid && !item.free).length,
    [parameters],
  );

  const handlePurchaseCredits = async (creditAmount: number) => {
    try {
      setIsPurchasingCredits(creditAmount);
      setPurchaseError(null);
      setPurchaseMessage(null);

      await planService.purchase({
        credits: creditAmount,
        payment_reference: createPaymentReference(creditAmount),
      });

      const [refreshedPlan, refreshedPayments] = await Promise.all([
        planService.getCurrent(),
        planService.getPaymentHistory(),
      ]);

      setPlanSummary(refreshedPlan);
      setPayments(refreshedPayments.payments ?? []);
      setCredits(refreshedPlan.credits ?? 0);
      setPurchaseMessage(`${creditAmount} credits added to your account.`);
    } catch {
      setPurchaseError("Unable to purchase credits right now.");
    } finally {
      setIsPurchasingCredits(null);
    }
  };

  const openDashboardPanel = (panel: DashboardPanel) => {
    setActiveDashboardPanel(panel);
    window.setTimeout(() => {
      activePanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  };

  useEffect(() => {
    const openPanelFromHash = () => {
      if (window.location.hash === "#credits-access") {
        openDashboardPanel("credits");
      }
    };

    openPanelFromHash();
    window.addEventListener("hashchange", openPanelFromHash);

    return () => {
      window.removeEventListener("hashchange", openPanelFromHash);
    };
  }, []);

  return (
    <AppScaffold
      title="Dashboard"
      description="Keep private profiles, credits, recent compatibility activity, and strongest matches together in one dashboard built for repeated matchmaking workflows."
      actions={
        <>
          <ActionLink href="/connections">Connections</ActionLink>
          <ActionLink href="/private-persons">Private User</ActionLink>
          <ActionLink href="/compatibility" variant="primary">
            Run compatibility
          </ActionLink>
        </>
      }
    >
      {error ? <AlertMessage>{error}</AlertMessage> : null}

      <div className="grid gap-8">
        <SectionCard
          eyebrow="Command Center"
          title="Matchmaking at a glance"
          description="The core actions for private-user management, matching, and repeat review are grouped here so you can move between setup and analysis without hunting through the app."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricTile label="Private Users" value={privatePersons.length} />
            <MetricTile
              label="Top Match"
              value={
                strongestMatch ? (
                  <span className="block text-3xl leading-tight">{strongestMatch.personName}</span>
                ) : (
                  "--"
                )
              }
            />
            <MetricTile label="Credits Available" value={availableCredits} />
            <MetricTile label="Saved Checks" value={history.length} />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <ActionTile
              eyebrow="Private Users"
              title="Build your shortlist"
              description="Add new private profiles, review your full library, or jump straight to the strongest current match."
              action={
                <div className="flex flex-wrap gap-3">
                  <ActionLink href="/private-persons" variant="primary">
                    Private User
                  </ActionLink>
                  <Button
                    aria-pressed={activeDashboardPanel === "top-matches"}
                    className={
                      activeDashboardPanel === "top-matches"
                        ? "ring-2 ring-accent ring-offset-2 ring-offset-[#fafafa]"
                        : ""
                    }
                    variant="secondary"
                    onClick={() => openDashboardPanel("top-matches")}
                  >
                    Top match
                  </Button>
                </div>
              }
            />

            <ActionTile
              eyebrow="Matching"
              title="Run the next check"
              description="Go directly into compatibility calculation or review the result archive before running another comparison."
              action={
                <div className="flex flex-wrap gap-3">
                  <ActionLink href="/compatibility" variant="primary">
                    Run compatibility
                  </ActionLink>
                  <Button
                    aria-pressed={activeDashboardPanel === "history"}
                    className={
                      activeDashboardPanel === "history"
                        ? "ring-2 ring-accent ring-offset-2 ring-offset-[#fafafa]"
                        : ""
                    }
                    variant="secondary"
                    onClick={() => openDashboardPanel("history")}
                  >
                    Open results
                  </Button>
                </div>
              }
            />

            <ActionTile
              eyebrow="Account"
              title="Keep the data ready"
              description="Maintain your own birth details and keep premium parameters available for deeper readings."
              action={
                <div className="flex flex-wrap gap-3">
                  <ActionLink href="/profile" variant="primary" className="rounded-full px-5 py-3">
                    Update profile
                  </ActionLink>
                  <Button
                    aria-pressed={activeDashboardPanel === "credits"}
                    className={
                      activeDashboardPanel === "credits"
                        ? "ring-2 ring-accent ring-offset-2 ring-offset-[#fafafa]"
                        : ""
                    }
                    variant="secondary"
                    onClick={() => openDashboardPanel("credits")}
                  >
                    Credits & access
                  </Button>
                </div>
              }
            />
          </div>
        </SectionCard>
      </div>

      {activeDashboardPanel ? (
        <div ref={activePanelRef} className="scroll-mt-6">
          {activeDashboardPanel === "private-users" ? (
            <SectionCard
              eyebrow="Private Users"
              title="Private user workspace"
              description="The dashboard section for managing your private matchmaking pool and deciding what to do next with it."
              actions={<ActionLink href="/private-persons">Private User</ActionLink>}
            >
          <div className="grid gap-4 md:grid-cols-3">
            <MetricTile label="Profiles Saved" value={privatePersons.length} />
            <MetricTile
              label="Latest Addition"
              value={latestPrivatePerson?.name ?? "--"}
              className="min-h-[148px]"
            />
            <MetricTile
              label="Top Match"
              value={
                strongestMatch ? (
                  <span className="block text-3xl leading-tight">{strongestMatch.personName}</span>
                ) : (
                  "--"
                )
              }
              className="min-h-[148px]"
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
            <div className={`${designSystem.inset} p-5`}>
              <p className={designSystem.eyebrow}>Recommended Actions</p>
              <h3 className="mt-3 font-display text-3xl font-semibold tracking-tight text-primary">
                Keep your shortlist active
              </h3>
              <BodyText className="mt-3 leading-6">
                Matchmaking work tends to start with good private data. Add new people,
                review existing records, and use top-match feedback to decide who should be
                checked next.
              </BodyText>

              <div className="mt-6 flex flex-wrap gap-3">
                <ActionLink href="/private-persons" variant="primary">
                  Private User
                </ActionLink>
                <Button
                  variant="secondary"
                  onClick={() => openDashboardPanel("top-matches")}
                >
                  Top match
                </Button>
              </div>
            </div>

            <div className={`${designSystem.inset} p-5`}>
              <p className={designSystem.label}>Library Snapshot</p>
              {privatePersons.length === 0 ? (
                <EmptyState className="mt-4 p-5">
                  No private users have been added yet. This section becomes more useful once
                  you save your first profile.
                </EmptyState>
              ) : (
                <div className="mt-4 space-y-3">
                  {privatePersons.slice(0, 3).map((person) => (
                    <div key={person.id} className={designSystem.tile}>
                      <p className="text-sm font-semibold text-primary">{person.name}</p>
                      <BodyText className="mt-1 leading-6">
                        {person.place_of_birth || "Place pending"} · DOB {person.date_of_birth}
                      </BodyText>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
            </SectionCard>
          ) : null}

          {activeDashboardPanel === "credits" ? (
            <SectionCard
              eyebrow="Credits"
              title="Credits & access"
              description="Track balance, understand free versus paid access, and add more credits without leaving the dashboard."
              actions={
                <ActionLink href="/compatibility" variant="primary">
                  Use credits now
                </ActionLink>
              }
            >
          <div id="credits-access" className="grid gap-4 md:grid-cols-3">
            <MetricTile label="Available" value={availableCredits} />
            <MetricTile label="Free Credits" value={freeCredits} />
            <MetricTile label="Paid Credits" value={paidCredits} />
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
            <div className={`${designSystem.inset} p-5`}>
              <p className={designSystem.eyebrow}>Purchase Credit</p>
              <h3 className="mt-3 font-display text-3xl font-semibold tracking-tight text-primary">
                Add credits in one step
              </h3>
              <BodyText className="mt-3 leading-6">
                Use the quick purchase options below to keep compatibility analysis moving.
                Premium parameter access becomes more practical when you have enough credits
                to compare multiple candidates back to back.
              </BodyText>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {purchaseOptions.map((creditAmount) => (
                  <button
                    key={creditAmount}
                    className={`${designSystem.tile} flex items-center justify-between text-left transition hover:-translate-y-0.5 hover:border-accent`}
                    disabled={isPurchasingCredits !== null}
                    type="button"
                    onClick={() => handlePurchaseCredits(creditAmount)}
                  >
                    <span>
                      <span className="block text-sm font-semibold text-primary">
                        {creditAmount} credits
                      </span>
                      <span className="mt-1 block text-xs uppercase tracking-[0.18em] text-foreground/48">
                        Purchase
                      </span>
                    </span>
                    <span className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
                      {isPurchasingCredits === creditAmount ? "Working" : "Buy"}
                    </span>
                  </button>
                ))}
              </div>

              {purchaseMessage ? (
                <AlertMessage className="mt-4 border-[#eabfb9] bg-[#fafafa] text-[#7f533e]">
                  {purchaseMessage}
                </AlertMessage>
              ) : null}
              {purchaseError ? <AlertMessage className="mt-4">{purchaseError}</AlertMessage> : null}
            </div>

            <div className={`${designSystem.inset} p-5`}>
              <p className={designSystem.label}>Access Snapshot</p>
              <div className="mt-4 space-y-3">
                <div className={designSystem.tile}>
                  <p className="text-sm font-semibold text-primary">Free parameters</p>
                  <BodyText className="mt-2 leading-6">
                    {unlockedParameters} available without extra spend.
                  </BodyText>
                </div>
                <div className={designSystem.tile}>
                  <p className="text-sm font-semibold text-primary">Premium parameters</p>
                  <BodyText className="mt-2 leading-6">
                    {premiumParameters} deeper signals available through paid access.
                  </BodyText>
                </div>
                <div className={designSystem.tile}>
                  <p className="text-sm font-semibold text-primary">Last payment activity</p>
                  <BodyText className="mt-2 leading-6">
                    {latestPayment
                      ? `${latestPayment.credits_purchased ?? 0} credits · ${formatDate(latestPayment.created_at)}`
                      : "No payment activity has been recorded yet."}
                  </BodyText>
                </div>
              </div>
            </div>
          </div>
            </SectionCard>
          ) : null}

          {activeDashboardPanel === "profile" ? (
            <SectionCard
              eyebrow="Profile"
              title="Profile readiness"
              description="Keep your own birth data current before comparing new candidates."
            >
          <div className="grid gap-4 md:grid-cols-2">
            <div className={`${designSystem.inset} p-5`}>
              <p className={designSystem.eyebrow}>Profile Readiness</p>
              <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-primary">
                Keep your birth data current
              </h3>
              <BodyText className="mt-3 leading-6">
                Your own saved profile is the anchor for every compatibility run. Update it
                before comparing new candidates.
              </BodyText>
              <div className="mt-5">
                <ActionLink href="/profile" variant="primary">
                  Update profile
                </ActionLink>
              </div>
            </div>

            <div className={`${designSystem.inset} p-5`}>
              <p className={designSystem.label}>Recent activity</p>
              <p className="mt-3 text-lg font-semibold text-primary">
                {history.length} stored compatibility check{history.length === 1 ? "" : "s"}
              </p>
              <BodyText className="mt-2 leading-6">
                A healthy archive makes it easier to spot patterns across multiple potential
                matches.
              </BodyText>
            </div>
          </div>
            </SectionCard>
          ) : null}

          {activeDashboardPanel === "compatibility" ? (
            <SectionCard
              eyebrow="Matching"
              title="Run compatibility"
              description="Start a fresh compatibility run whenever a private user is ready for review."
            >
          <div className="grid gap-4 md:grid-cols-2">
            <div className={`${designSystem.inset} p-5`}>
              <p className={designSystem.label}>Need a new comparison?</p>
              <p className="mt-3 text-lg font-semibold text-primary">
                Go from shortlist to score quickly
              </p>
              <BodyText className="mt-2 leading-6">
                Start a fresh compatibility run whenever a new private user is ready for
                review.
              </BodyText>
              <div className="mt-5">
                <ActionLink href="/compatibility" variant="primary">
                  Run compatibility
                </ActionLink>
              </div>
            </div>

            <div className={`${designSystem.inset} p-5`}>
              <p className={designSystem.label}>Available balance</p>
              <p className="mt-3 text-lg font-semibold text-primary">
                {availableCredits} credit{availableCredits === 1 ? "" : "s"} ready
              </p>
              <BodyText className="mt-2 leading-6">
                Use credits for deeper compatibility analysis when premium parameters are
                needed.
              </BodyText>
            </div>
          </div>
            </SectionCard>
          ) : null}

          {activeDashboardPanel === "history" ? (
            <SectionCard
              eyebrow="Results"
              title="Result archive"
              description="Open the result archive when you need to compare multiple past checks instead of relying on a single top score."
            >
          <div className="grid gap-4 md:grid-cols-2">
            <div className={`${designSystem.inset} p-5`}>
              <p className={designSystem.eyebrow}>Results Review</p>
              <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-primary">
                Compare before you decide
              </h3>
              <BodyText className="mt-3 leading-6">
                Review past compatibility checks when you need to compare several candidates
                side by side.
              </BodyText>
              <div className="mt-5">
                <ActionLink href="/results" variant="primary">
                  Review result archive
                </ActionLink>
              </div>
            </div>

            <div className={`${designSystem.inset} p-5`}>
              <p className={designSystem.label}>Recent activity</p>
              <p className="mt-3 text-lg font-semibold text-primary">
                {history.length} stored compatibility check{history.length === 1 ? "" : "s"}
              </p>
              <BodyText className="mt-2 leading-6">
                A healthy archive makes it easier to spot patterns across multiple potential
                matches.
              </BodyText>
            </div>
          </div>
            </SectionCard>
          ) : null}

          {isLoading && (activeDashboardPanel === "top-matches" || activeDashboardPanel === "history") ? (
            <SectionCard
              title="Loading insights"
              description="Fetching compatibility history, top matches, private users, and credits."
            >
              <EmptyState className="border-black/10">Loading dashboard data...</EmptyState>
            </SectionCard>
          ) : !isLoading && activeDashboardPanel === "top-matches" ? (
            <div className="space-y-8">
              <div id="top-matches">
                <ResultsBoard
                  credits={availableCredits}
                  description="Top matches returned by the backend, sorted and grouped for quick review."
                  emptyMessage="No top matches are available yet."
                  parameters={parameters}
                  results={topMatches}
                  title="Top matches"
                />
              </div>
            </div>
          ) : !isLoading && activeDashboardPanel === "history" ? (
            <div className="space-y-8">
              <ResultsBoard
                credits={availableCredits}
                description="Recent compatibility history returned by the backend."
                emptyMessage="No compatibility history is available yet."
                parameters={parameters}
                results={history}
                title="History"
              />
            </div>
          ) : null}
        </div>
      ) : null}

    </AppScaffold>
  );
}
