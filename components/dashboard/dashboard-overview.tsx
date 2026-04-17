"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

const statusTone = (credits: number) => {
  if (credits <= 0) {
    return {
      label: "Needs credits",
      className: "border-[#eabfb9] bg-[#f5d5c8] text-[#901214]",
    };
  }

  if (credits <= 2) {
    return {
      label: "Low balance",
      className: "border-[rgba(192,119,113,0.28)] bg-[rgba(245,213,200,0.9)] text-[#7f533e]",
    };
  }

  return {
    label: "Ready to match",
    className: "border-[#eabfb9] bg-[#fafafa] text-[#7f533e]",
  };
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
  const router = useRouter();
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
  const topStatus = statusTone(availableCredits);

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

  return (
    <AppScaffold
      title="Dashboard"
      description="Keep private profiles, credits, recent compatibility activity, and strongest matches together in one dashboard built for repeated matchmaking workflows."
      actions={
        <>
          <ActionLink href="/private-persons">Show all private users</ActionLink>
          <ActionLink href="/compatibility" variant="primary">
            Run compatibility
          </ActionLink>
        </>
      }
    >
      {error ? <AlertMessage>{error}</AlertMessage> : null}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <SectionCard
          eyebrow="Command Center"
          title="Matchmaking at a glance"
          description="The core actions for private-user management, matching, and repeat review are grouped here so you can move between setup and analysis without hunting through the app."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricTile label="Private Users" value={privatePersons.length} />
            <MetricTile
              label="Top Match"
              value={strongestMatch ? Math.round(strongestMatch.score) : "--"}
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
                    Add private user
                  </ActionLink>
                  <ActionLink href="/private-persons">Show all private users</ActionLink>
                  <ActionLink href="#top-matches">Top match</ActionLink>
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
                  <ActionLink href="/results">Open results</ActionLink>
                </div>
              }
            />

            <ActionTile
              eyebrow="Account"
              title="Keep the data ready"
              description="Maintain your own birth details and keep premium parameters available for deeper readings."
              action={
                <div className="flex flex-wrap gap-3">
                  <ActionLink href="/profile" variant="primary">
                    Update profile
                  </ActionLink>
                  <ActionLink href="#credits-access">Credits & access</ActionLink>
                </div>
              }
            />
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Status"
          title="Current readiness"
          description="A compact summary of whether this account is ready to keep matching without interruption."
        >
          <div
            className={`${designSystem.inset} flex items-center justify-between gap-4 p-5`}
          >
            <div>
              <p className={designSystem.label}>Dashboard State</p>
              <p className="mt-3 font-display text-3xl font-semibold text-primary">
                {topStatus.label}
              </p>
            </div>
            <span
              className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] ${topStatus.className}`}
            >
              {availableCredits} credits
            </span>
          </div>

          <div className="mt-5 space-y-4">
            <div className={designSystem.tile}>
              <p className={designSystem.label}>Last private user added</p>
              <p className="mt-3 text-lg font-semibold text-primary">
                {latestPrivatePerson?.name ?? "No private users yet"}
              </p>
              <BodyText className="mt-2 leading-6">
                {latestPrivatePerson
                  ? `Added ${formatDate(latestPrivatePerson.created_at)}`
                  : "Create a private profile to start building a working shortlist."}
              </BodyText>
            </div>

            <div className={designSystem.tile}>
              <p className={designSystem.label}>Strongest available match</p>
              <p className="mt-3 text-lg font-semibold text-primary">
                {strongestMatch?.personName ?? "No top matches yet"}
              </p>
              <BodyText className="mt-2 leading-6">
                {strongestMatch
                  ? `Current leading score: ${strongestMatch.score.toFixed(1)}`
                  : "Run compatibility checks to surface high-confidence matches here."}
              </BodyText>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <SectionCard
          eyebrow="Private Users"
          title="Private user workspace"
          description="The dashboard section for managing your private matchmaking pool and deciding what to do next with it."
          actions={<ActionLink href="/private-persons">Show all private users</ActionLink>}
        >
          <div className="grid gap-4 md:grid-cols-3">
            <MetricTile label="Profiles Saved" value={privatePersons.length} />
            <MetricTile
              label="Latest Addition"
              value={latestPrivatePerson?.name ?? "--"}
              className="min-h-[148px]"
            />
            <MetricTile
              label="Top Match Score"
              value={strongestMatch ? strongestMatch.score.toFixed(1) : "--"}
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
                  Add private user
                </ActionLink>
                <ActionLink href="/private-persons">Show all private users</ActionLink>
                <ActionLink href="#top-matches">Top match</ActionLink>
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
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <SectionCard
          eyebrow="Workflow"
          title="What matchmaking users usually need next"
          description="Beyond private profiles and credits, most repeat users need quick access to profile readiness, result history, and decision support."
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
              <p className={designSystem.eyebrow}>Results Review</p>
              <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-primary">
                Compare before you decide
              </h3>
              <BodyText className="mt-3 leading-6">
                Open the result archive when you need to compare multiple past checks instead
                of relying on a single top score.
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
                <Button onClick={() => router.push("/compatibility")}>Run compatibility</Button>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Billing"
          title="Recent credit activity"
          description="A short payment history helps users verify that purchases landed before they continue matching."
        >
          {payments.length === 0 ? (
            <EmptyState>No payment history is available yet.</EmptyState>
          ) : (
            <div className="space-y-3">
              {payments.slice(0, 4).map((payment) => (
                <div
                  key={String(payment.id)}
                  className={`${designSystem.inset} flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between`}
                >
                  <div>
                    <p className="text-sm font-semibold text-primary">
                      {payment.credits_purchased ?? 0} credits
                    </p>
                    <BodyText className="mt-1 leading-6">
                      {payment.payment_reference || "Reference pending"}
                    </BodyText>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-sm font-medium capitalize text-primary">
                      {payment.status || "Completed"}
                    </p>
                    <BodyText className="mt-1 leading-6">
                      {formatDate(payment.created_at)}
                    </BodyText>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {isLoading ? (
        <SectionCard
          title="Loading insights"
          description="Fetching compatibility history, top matches, private users, and credits."
        >
          <EmptyState className="border-black/10">Loading dashboard data...</EmptyState>
        </SectionCard>
      ) : (
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

          <ResultsBoard
            credits={availableCredits}
            description="Recent compatibility history returned by the backend."
            emptyMessage="No compatibility history is available yet."
            parameters={parameters}
            results={history}
            title="History"
          />
        </div>
      )}
    </AppScaffold>
  );
}
