"use client";

import { useEffect, useState } from "react";
import { ResultsBoard } from "@/components/results/results-board";
import { AlertMessage, EmptyState } from "@/components/ui/design-system";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { compatibilityService } from "@/services/compatibilityService";
import { normalizeCompatibilityResults } from "@/services/compatibilityMapper";
import type { StoredCompatibilityResult } from "@/store/resultsStore";

const topScoresPageSize = 5;

const getMatchType = (result: StoredCompatibilityResult) => {
  if (result.matchType) {
    return result.matchType;
  }

  const raw = result.raw;
  const hasValue = (value: unknown) => value !== null && value !== undefined;

  if (
    raw.is_private_match === true
  ) {
    return "private";
  }

  return "public";
};

export function TopScoresManager() {
  const { credits, parameters } = usePlanAccess();
  const [results, setResults] = useState<StoredCompatibilityResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await compatibilityService.history();
        setResults(normalizeCompatibilityResults(response));
      } catch {
        setError("Unable to load compatibility scores right now.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const privateCount = results.filter((result) => getMatchType(result) === "private").length;
  const publicCount = results.length - privateCount;

  return (
    <main className="min-h-screen bg-[#fffafa] text-[#2d1718]">
      <section className="bg-[linear-gradient(180deg,#fffafa_0%,#fdf1f0_100%)] px-6 py-10">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="inline-flex rounded-full bg-[#EABFB9] px-4 py-2 text-sm font-bold text-[#901214]">
              compatibility leaderboard
            </p>
            <h1 className="mt-5 font-display text-5xl font-bold leading-tight tracking-tight text-[#2d1718] sm:text-6xl">
              Top Scores
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#2d1718]/72">
              Your top compatibility scores based on compatibility tests you performed.
            </p>
          </div>

          <div className="rounded-2xl border border-[#EABFB9] bg-[#fafafa] p-6 shadow-[0_18px_42px_rgba(144,18,20,0.1)]">
            <p className="text-sm font-bold text-[#901214]">Score Snapshot</p>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-[#EABFB9] bg-[#fffafa] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7F533E]">
                  Total
                </p>
                <p className="mt-2 font-display text-4xl font-bold text-[#901214]">
                  {results.length}
                </p>
              </div>
              <div className="rounded-xl border border-[#EABFB9] bg-[#fffafa] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7F533E]">
                  Private
                </p>
                <p className="mt-2 font-display text-4xl font-bold text-[#901214]">
                  {privateCount}
                </p>
              </div>
              <div className="rounded-xl border border-[#EABFB9] bg-[#fffafa] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7F533E]">
                  Public
                </p>
                <p className="mt-2 font-display text-4xl font-bold text-[#901214]">
                  {publicCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8">
        {error ? <AlertMessage>{error}</AlertMessage> : null}

        {isLoading ? (
          <EmptyState>Loading compatibility scores...</EmptyState>
        ) : (
          <ResultsBoard
            credits={credits}
            description=""
            emptyMessage="No compatibility scores are available yet. Run a compatibility check first."
            pageSize={topScoresPageSize}
            parameters={parameters}
            results={results}
            title=""
            variant="scores"
          />
        )}
      </div>
    </main>
  );
}
