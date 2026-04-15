"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  BodyText,
  EmptyState,
  InfoTile,
  designSystem,
} from "@/components/ui/design-system";
import { SectionCard } from "@/components/ui/section-card";
import type { StoredCompatibilityResult } from "@/store/resultsStore";
import type { PlanParameters } from "@/types/plan";

interface ResultsBoardProps {
  credits?: number;
  emptyMessage: string;
  parameters: PlanParameters;
  results: StoredCompatibilityResult[];
  title: string;
  description: string;
  onClear?: () => void;
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

const scoreRingStyle = (score: number) => {
  const clampedScore = Math.max(8, Math.min(score, 100));
  const degrees = (clampedScore / 100) * 360;

  return {
    background: `conic-gradient(#d2a74b ${degrees}deg, rgba(49,36,87,0.12) 0deg)`,
  };
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

const LockedParameterValue = ({
  value,
  cta,
}: {
  value: string;
  cta: string;
}) => (
  <div className="relative isolate overflow-hidden rounded-xl border border-[rgba(49,36,87,0.08)] bg-[linear-gradient(135deg,rgba(28,20,52,0.94)_0%,rgba(41,31,74,0.96)_100%)] px-3 py-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(210,167,75,0.22),transparent_48%)]" />
    <span className="block select-none blur-md opacity-80">{value}</span>
    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,7,19,0.08)_0%,rgba(10,7,19,0.68)_100%)]" />
    <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 rounded-xl border border-[rgba(210,167,75,0.24)] bg-[rgba(16,12,30,0.78)] px-3 py-2 text-center shadow-[0_10px_30px_rgba(6,4,13,0.32)] backdrop-blur-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[rgba(210,167,75,0.98)]">
        Locked Insight
      </p>
      <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-white/88">
        {cta}
      </p>
    </div>
  </div>
);

export function ResultsBoard({
  credits = 0,
  description,
  emptyMessage,
  onClear,
  parameters,
  results,
  title,
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
        <span>{credits} credits available</span>
      </div>

      {groupedResults.length === 0 ? (
        <EmptyState>{emptyMessage}</EmptyState>
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
                  <p className="mt-2 text-sm text-foreground/60">
                    Highest score: {group.topScore.toFixed(1)}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {group.items.map((result) => (
                  <div
                    key={result.id}
                    className="rounded-[1.65rem] border border-[rgba(49,36,87,0.08)] bg-[rgba(255,250,242,0.86)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.68)]"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className="grid h-20 w-20 place-items-center rounded-full p-[6px] shadow-[0_16px_34px_rgba(36,23,63,0.14)]"
                          style={scoreRingStyle(result.score)}
                        >
                          <div className="grid h-full w-full place-items-center rounded-full bg-[rgba(255,250,242,0.96)]">
                            <span className="font-display text-3xl font-semibold text-primary">
                              {Math.round(result.score)}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent">
                            Compatibility Score
                          </p>
                          <p className="mt-2 h-2.5 w-40 overflow-hidden rounded-full bg-[rgba(49,36,87,0.12)]">
                            <span
                              className="block h-full rounded-full bg-[linear-gradient(90deg,#d2a74b_0%,#6d57b6_100%)]"
                              style={{ width: `${Math.max(6, Math.min(result.score, 100))}%` }}
                            />
                          </p>
                          <p className="mt-3 text-3xl font-semibold text-primary">
                            {result.score.toFixed(1)}
                          </p>
                        </div>
                      </div>
                      <div className="sm:text-right">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-foreground/42">
                          Compatibility Score
                        </p>
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

                          return (
                            <div
                              key={`${result.id}-${parameter.key}`}
                              className="rounded-2xl bg-muted/40 p-4"
                            >
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
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
