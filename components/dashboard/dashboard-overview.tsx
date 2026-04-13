"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppScaffold } from "@/components/layout/app-scaffold";
import { ResultsBoard } from "@/components/results/results-board";
import {
  ActionLink,
  AlertMessage,
  EmptyState,
  MetricTile,
} from "@/components/ui/design-system";
import { SectionCard } from "@/components/ui/section-card";
import { compatibilityService } from "@/services/compatibilityService";
import { normalizeCompatibilityResults } from "@/services/compatibilityMapper";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import type { StoredCompatibilityResult } from "@/store/resultsStore";

export function DashboardOverview() {
  const { credits, parameters } = usePlanAccess();
  const [history, setHistory] = useState<StoredCompatibilityResult[]>([]);
  const [topMatches, setTopMatches] = useState<StoredCompatibilityResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [historyResponse, topMatchesResponse] = await Promise.all([
          compatibilityService.history(),
          compatibilityService.topMatches(),
        ]);

        setHistory(normalizeCompatibilityResults(historyResponse));
        setTopMatches(normalizeCompatibilityResults(topMatchesResponse));
      } catch {
        setError("Unable to load dashboard compatibility insights right now.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return (
    <AppScaffold
      title="Dashboard"
      description="Track recent compatibility activity, review your strongest matches, and keep an eye on plan access before drilling into detailed results."
    >
      <div className="grid gap-8 lg:grid-cols-3">
        <SectionCard
          eyebrow="Overview"
          title="Overview"
          description="Quick status for the current session and account."
        >
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <MetricTile label="Credits" value={credits} />
            <MetricTile
              label="Free Parameters"
              value={Object.values(parameters).filter((item) => item.free).length}
            />
            <MetricTile
              label="Paid Parameters"
              value={
                Object.values(parameters).filter((item) => item.paid && !item.free).length
              }
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <ActionLink href="/compatibility" variant="primary">
              Run compatibility
            </ActionLink>
            <ActionLink href="/results">Open results</ActionLink>
          </div>
        </SectionCard>

        <div className="lg:col-span-2">
          {error ? <AlertMessage>{error}</AlertMessage> : null}

          {isLoading ? (
            <SectionCard
              title="Loading insights"
              description="Fetching compatibility history and top matches."
            >
              <EmptyState className="border-black/10">Loading dashboard data...</EmptyState>
            </SectionCard>
          ) : (
            <div className="space-y-8">
              <ResultsBoard
                credits={credits}
                description="Recent compatibility history returned by the backend."
                emptyMessage="No compatibility history is available yet."
                parameters={parameters}
                results={history}
                title="History"
              />
              <ResultsBoard
                credits={credits}
                description="Top matches returned by the backend, sorted and grouped for quick review."
                emptyMessage="No top matches are available yet."
                parameters={parameters}
                results={topMatches}
                title="Top matches"
              />
            </div>
          )}
        </div>
      </div>
    </AppScaffold>
  );
}
