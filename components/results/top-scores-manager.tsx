"use client";

import { useEffect, useState } from "react";
import { AppScaffold } from "@/components/layout/app-scaffold";
import { ResultsBoard } from "@/components/results/results-board";
import { AlertMessage, EmptyState } from "@/components/ui/design-system";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { compatibilityService } from "@/services/compatibilityService";
import { normalizeCompatibilityResults } from "@/services/compatibilityMapper";
import type { StoredCompatibilityResult } from "@/store/resultsStore";

const topScoresPageSize = 5;

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

  return (
    <AppScaffold
      title="Top Scores"
      description="All compatibility scores sorted from strongest to weakest, with five results shown per page."
    >
      {error ? <AlertMessage className="mb-6">{error}</AlertMessage> : null}

      {isLoading ? (
        <EmptyState>Loading compatibility scores...</EmptyState>
      ) : (
        <ResultsBoard
          credits={credits}
          description="Every compatibility result is sorted by score so the strongest matches stay easiest to compare."
          emptyMessage="No compatibility scores are available yet. Run a compatibility check first."
          pageSize={topScoresPageSize}
          parameters={parameters}
          results={results}
          title="Top compatibility scores"
          variant="scores"
        />
      )}
    </AppScaffold>
  );
}
