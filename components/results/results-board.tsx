"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  BodyText,
  EmptyState,
  InfoTile,
  designSystem,
} from "@/components/ui/design-system";
import { SectionCard } from "@/components/ui/section-card";
import {
  CompatibilityScoreLine,
  CompatibilityScoreRing,
  isNumericCompatibilityValue,
} from "@/components/ui/compatibility-score";
import type { StoredCompatibilityResult } from "@/store/resultsStore";
import type { PlanParameters } from "@/types/plan";

interface ResultsBoardProps {
  credits?: number;
  emptyMessage: string;
  parameters: PlanParameters;
  pageSize?: number;
  results: StoredCompatibilityResult[];
  title: string;
  description: string;
  onClear?: () => void;
  variant?: "grouped" | "scores";
}

const formatDate = (value?: string) => {
  if (!value) {
    return null;
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

const sortByScore = (
  left: StoredCompatibilityResult,
  right: StoredCompatibilityResult,
) => {
  if (right.score !== left.score) {
    return right.score - left.score;
  }

  return (
    new Date(right.createdAt ?? 0).getTime() -
    new Date(left.createdAt ?? 0).getTime()
  );
};

const LockedParameterValue = ({
  value,
  cta,
}: {
  value: string;
  cta: string;
}) => (
  <div className="relative isolate overflow-hidden rounded-xl border border-[rgba(144,18,20,0.12)] bg-[linear-gradient(135deg,rgba(144,18,20,0.94)_0%,rgba(127,83,62,0.96)_100%)] px-3 py-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(245,213,200,0.24),transparent_48%)]" />
    <span className="block select-none blur-md opacity-80">{value}</span>
    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,13,10,0.08)_0%,rgba(12,13,10,0.6)_100%)]" />
    <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 rounded-xl border border-[rgba(245,213,200,0.28)] bg-[rgba(12,13,10,0.72)] px-3 py-2 text-center shadow-[0_10px_30px_rgba(12,13,10,0.28)] backdrop-blur-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[rgba(245,213,200,0.98)]">
        Locked Insight
      </p>
      <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-white/90">
        {cta}
      </p>
    </div>
  </div>
);

function ResultCard({
  parameters,
  result,
  showPersonName = false,
}: {
  parameters: PlanParameters;
  result: StoredCompatibilityResult;
  showPersonName?: boolean;
}) {
  return (
    <div className="rounded-[1.65rem] border border-[rgba(144,18,20,0.08)] bg-[rgba(250,250,250,0.86)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.68)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <CompatibilityScoreRing score={result.score} size="sm" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent">
              Compatibility Score
            </p>
            {showPersonName ? (
              <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-primary">
                {result.personName}
              </p>
            ) : null}
          </div>
        </div>
        <div className="sm:text-right">
          {result.createdAt ? (
            <p className="mt-3 text-sm text-foreground/55">
              {formatDate(result.createdAt)}
            </p>
          ) : null}
        </div>
      </div>

      {result.summary ? (
        <BodyText className="mt-4 leading-6">{result.summary}</BodyText>
      ) : null}

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {result.parameters.length > 0 ? (
          result.parameters.map((parameter) => {
            const locked = shouldBlurParameter(parameter, parameters);
            const numericValue = Number(parameter.value);
            const showScoreLine =
              !locked && isNumericCompatibilityValue(parameter.value);

            return (
              <div
                key={`${result.id}-${parameter.key}`}
                className="rounded-2xl bg-muted/40 p-4"
              >
                {showScoreLine ? (
                  <CompatibilityScoreLine label={parameter.label} score={numericValue} />
                ) : (
                  <>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/45">
                      {parameter.label}
                    </dt>
                    <dd className="mt-3 min-h-12 text-sm font-medium text-foreground">
                      {locked ? (
                        <LockedParameterValue
                          cta="Unlock Full Compatibility"
                          value={parameter.value}
                        />
                      ) : (
                        parameter.value
                      )}
                    </dd>
                  </>
                )}
              </div>
            );
          })
        ) : (
          <InfoTile className="rounded-2xl border-0 bg-muted/40 text-sm text-foreground/60 shadow-none">
            No parameter breakdown was returned for this result.
          </InfoTile>
        )}
      </div>
    </div>
  );
}

export function ResultsBoard({
  credits = 0,
  description,
  emptyMessage,
  onClear,
  pageSize,
  parameters,
  results,
  title,
  variant = "grouped",
}: ResultsBoardProps) {
  const groupedResults = useMemo(() => {
    const groups = results.reduce<Record<string, StoredCompatibilityResult[]>>(
      (accumulator, result) => {
        const key = `${result.personId}:${result.personName}`;

        if (!accumulator[key]) {
          accumulator[key] = [];
        }

        accumulator[key].push(result);
        return accumulator;
      },
      {},
    );

    return Object.entries(groups)
      .map(([groupKey, groupResults]) => ({
        groupKey,
        personName: groupResults[0]?.personName ?? "Unknown Person",
        topScore: Math.max(...groupResults.map((result) => result.score)),
        items: [...groupResults].sort((left, right) => right.score - left.score),
      }))
      .sort((left, right) => right.topScore - left.topScore);
  }, [results]);
  const sortedResults = useMemo(
    () => [...results].sort(sortByScore),
    [results],
  );
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages =
    variant === "scores" && pageSize
      ? Math.max(1, Math.ceil(sortedResults.length / pageSize))
      : 1;
  const paginatedResults =
    variant === "scores" && pageSize
      ? sortedResults.slice((currentPage - 1) * pageSize, currentPage * pageSize)
      : sortedResults;

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, results.length, variant]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  return (
    <SectionCard
      title={title}
      description={description}
      actions={
        onClear ? (
          <Button onClick={onClear} variant="secondary">
            Clear stored results
          </Button>
        ) : undefined
      }
    >
      <div className={`${designSystem.inset} mb-6 flex items-center justify-between px-4 py-3 text-sm text-foreground/70`}>
        <span>{results.length} result entries</span>
        <span>
          {variant === "scores" && pageSize
            ? `Page ${currentPage} of ${totalPages}`
            : `${credits} credits available`}
        </span>
      </div>

      {results.length === 0 ? (
        <EmptyState>{emptyMessage}</EmptyState>
      ) : variant === "scores" ? (
        <div className="space-y-5">
          {paginatedResults.map((result) => (
            <ResultCard
              key={result.id}
              parameters={parameters}
              result={result}
              showPersonName
            />
          ))}

          {pageSize && totalPages > 1 ? (
            <div className={`${designSystem.inset} flex flex-wrap items-center justify-between gap-3 px-4 py-3`}>
              <Button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                variant="secondary"
              >
                Previous
              </Button>
              <span className="text-sm font-medium text-foreground/65">
                Showing {(currentPage - 1) * pageSize + 1}-
                {Math.min(currentPage * pageSize, sortedResults.length)} of{" "}
                {sortedResults.length}
              </span>
              <Button
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
                variant="secondary"
              >
                Next
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-5">
          {groupedResults.map((group) => (
            <article key={group.groupKey} className={designSystem.surface}>
              <div className="flex flex-col gap-3 border-b border-black/6 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className={designSystem.eyebrow}>Compatibility Subject</p>
                  <h3 className="mt-3 font-display text-4xl font-semibold tracking-tight text-primary">
                    {group.personName}
                  </h3>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {group.items.map((result) => (
                  <ResultCard
                    key={result.id}
                    parameters={parameters}
                    result={result}
                  />
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
