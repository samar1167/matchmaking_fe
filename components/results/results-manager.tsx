"use client";

import { AppScaffold } from "@/components/layout/app-scaffold";
import { ResultsBoard } from "@/components/results/results-board";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { useResultsStore } from "@/store/resultsStore";

export function ResultsManager() {
  const results = useResultsStore((state) => state.results);
  const clearResults = useResultsStore((state) => state.clearResults);
  const { credits, parameters } = usePlanAccess();

  return (
    <AppScaffold
      title="Results"
      description="Stored compatibility output grouped by person and sorted by score. Free parameters remain visible, while paid details stay blurred until unlocked."
    >
      <ResultsBoard
        credits={credits}
        description="Each person is grouped together with their highest score first. Paid-only parameters remain hidden until unlocked."
        emptyMessage="No compatibility results are stored yet. Run a compatibility check first."
        onClear={clearResults}
        parameters={parameters}
        results={results}
        title="Grouped compatibility results"
      />
    </AppScaffold>
  );
}
