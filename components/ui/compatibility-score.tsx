"use client";

import { cn } from "@/lib/cn";

type CompatibilityImpact = "excellent" | "good" | "bad";

const scoreMax = 10;

const impactStyles: Record<
  CompatibilityImpact,
  {
    color: string;
    fill: string;
    ringTrack: string;
    soft: string;
    text: string;
    darkText: string;
  }
> = {
  excellent: {
    color: "#901214",
    fill: "linear-gradient(90deg,#c07771 0%,#901214 100%)",
    ringTrack: "rgba(144,18,20,0.14)",
    soft: "rgba(144,18,20,0.14)",
    text: "text-primary",
    darkText: "text-[#f5d5c8]",
  },
  good: {
    color: "#c07771",
    fill: "linear-gradient(90deg,#eabfb9 0%,#c07771 100%)",
    ringTrack: "rgba(192,119,113,0.18)",
    soft: "rgba(192,119,113,0.2)",
    text: "text-accent",
    darkText: "text-[#eabfb9]",
  },
  bad: {
    color: "#f5d5c8",
    fill: "linear-gradient(90deg,#eabfb9 0%,#7f533e 100%)",
    ringTrack: "rgba(245,213,200,0.34)",
    soft: "rgba(127,83,62,0.18)",
    text: "text-[#7f533e]",
    darkText: "text-[#b2806b]",
  },
};

export const getScoreOnTen = (score: number) => {
  const normalizedScore = score > scoreMax ? score / scoreMax : score;

  return Math.max(0, Math.min(normalizedScore, scoreMax));
};

export const getCompatibilityImpact = (score: number): CompatibilityImpact => {
  const scoreOnTen = getScoreOnTen(score);

  if (scoreOnTen > 7.5) {
    return "excellent";
  }

  if (scoreOnTen >= 4) {
    return "good";
  }

  return "bad";
};

export const formatCompatibilityScore = (score: number) =>
  getScoreOnTen(score).toFixed(1);

export const getCompatibilityCategory = (score: number) => {
  const scoreOnTen = getScoreOnTen(score);

  if (scoreOnTen > 9) {
    return "Excellent";
  }

  if (scoreOnTen >= 7) {
    return "Very Good";
  }

  if (scoreOnTen >= 5) {
    return "Good";
  }

  if (scoreOnTen >= 3) {
    return "Average";
  }

  return "Poor";
};

export function CompatibilityScoreRing({
  className,
  score,
  size = "md",
}: {
  className?: string;
  score: number;
  size?: "sm" | "md" | "lg";
}) {
  const scoreOnTen = getScoreOnTen(score);
  const impact = getCompatibilityImpact(score);
  const styles = impactStyles[impact];
  const degrees = Math.max(8, (scoreOnTen / scoreMax) * 360);
  const scoreCategory = getCompatibilityCategory(score);
  const sizeClass =
    size === "lg" ? "h-28 w-28" : size === "sm" ? "h-20 w-20" : "h-24 w-24";
  const textClass =
    size === "lg" ? "text-lg" : size === "sm" ? "text-sm" : "text-base";

  return (
    <div className={cn("flex flex-col items-center font-sans", className)}>
      <div
        aria-label={`Compatibility score ${scoreCategory}`}
        aria-valuemax={scoreMax}
        aria-valuemin={0}
        aria-valuenow={scoreOnTen}
        className={cn(
          "grid place-items-center rounded-full p-[6px] shadow-[0_16px_34px_rgba(144,18,20,0.14)]",
          sizeClass,
        )}
        role="meter"
        style={{
          background: `conic-gradient(from -90deg, ${styles.color} 0deg ${degrees}deg, ${styles.ringTrack} ${degrees}deg 360deg)`,
        }}
      >
        <div className="grid h-full w-full place-items-center rounded-full bg-[rgba(250,250,250,0.96)]">
          <div className="text-center">
            <span
              className={cn(
                "block px-2 font-display font-semibold leading-tight",
                styles.text,
                textClass,
              )}
            >
              {scoreCategory}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CompatibilityScoreLine({
  className,
  label = "Compatibility Score",
  score,
  tone = "light",
}: {
  className?: string;
  label?: string;
  score: number;
  tone?: "light" | "dark";
}) {
  const scoreOnTen = getScoreOnTen(score);
  const impact = getCompatibilityImpact(score);
  const styles = impactStyles[impact];
  const percentage = (scoreOnTen / scoreMax) * 100;
  const scoreCategory = getCompatibilityCategory(score);
  const mutedText = tone === "dark" ? "text-[#eabfb9]/72" : "text-foreground/52";
  const strongText = tone === "dark" ? styles.darkText : styles.text;
  const track = tone === "dark" ? "bg-white/10" : "bg-[rgba(144,18,20,0.1)]";

  return (
    <div
      aria-label={`${label} ${scoreCategory}`}
      aria-valuemax={scoreMax}
      aria-valuemin={0}
      aria-valuenow={scoreOnTen}
      className={cn("font-sans", className)}
      role="meter"
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className={cn("text-[11px] font-semibold uppercase tracking-[0.22em]", mutedText)}>
            {label}
          </p>
        </div>
        <p className={cn("font-display text-2xl font-semibold leading-none", strongText)}>
          {scoreCategory}
        </p>
      </div>
      <div className={cn("mt-3 h-2.5 overflow-hidden rounded-full", track)}>
        <div
          className="h-full rounded-full"
          style={{ background: styles.fill, width: `${Math.max(4, percentage)}%` }}
        />
      </div>
    </div>
  );
}

export function isNumericCompatibilityValue(value: string) {
  return value.trim() !== "" && Number.isFinite(Number(value));
}
