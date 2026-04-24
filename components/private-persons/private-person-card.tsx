"use client";

import {
  CompatibilityScoreLine,
  getCompatibilityCategory,
} from "@/components/ui/compatibility-score";
import type { StoredCompatibilityResult } from "@/store/resultsStore";
import type { PrivatePerson } from "@/types/private-persons";

interface PrivatePersonCardProps {
  compatibilityResult?: StoredCompatibilityResult;
  isChecking?: boolean;
  isDeleting?: boolean;
  onCheckCompatibility: () => void;
  onDelete: () => void;
  onDetails: () => void;
  onEdit: () => void;
  privatePerson: PrivatePerson;
}

const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

function EditIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 20h4.2L19.1 9.1a2.1 2.1 0 0 0 0-3L17.9 4.9a2.1 2.1 0 0 0-3 0L4 15.8V20Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path d="m13.7 6.1 4.2 4.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M5 7h14M9 7V5h6v2m-8 0 1 13h8l1-13"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function DetailsIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 11v6m0-10h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function PrivatePersonCard({
  compatibilityResult,
  isChecking = false,
  isDeleting = false,
  onCheckCompatibility,
  onDelete,
  onDetails,
  onEdit,
  privatePerson,
}: PrivatePersonCardProps) {
  return (
    <article className="group flex min-h-64 flex-col justify-between rounded-lg border border-[#EABFB9] bg-[#fafafa] p-5 shadow-[0_10px_24px_rgba(144,18,20,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(144,18,20,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-display text-3xl font-bold tracking-tight text-[#2d1718]">
          {privatePerson.name}
        </h3>
        <div className="flex shrink-0 gap-2">
          <button
            aria-label={`Edit ${privatePerson.name}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#C07771] bg-[#fafafa] text-[#901214] transition hover:border-[#901214]"
            type="button"
            onClick={onEdit}
          >
            <EditIcon />
          </button>
          <button
            aria-label={`Delete ${privatePerson.name}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#901214] text-white transition hover:bg-[#961116] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDeleting}
            type="button"
            onClick={onDelete}
          >
            <DeleteIcon />
          </button>
        </div>
      </div>

      <dl className="mt-6 grid gap-3">
        <div className="rounded-lg border border-[#EABFB9] bg-[#fffafa] p-4">
          <dt className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7F533E]">
            DOB
          </dt>
          <dd className="mt-2 text-sm font-bold text-[#901214]">
            {formatDate(privatePerson.date_of_birth)}
          </dd>
        </div>
        <div className="rounded-lg border border-[#EABFB9] bg-[#fffafa] p-4">
          <dt className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7F533E]">
            Place
          </dt>
          <dd className="mt-2 text-sm font-bold text-[#901214]">
            {privatePerson.place_of_birth || "Not available"}
          </dd>
        </div>
      </dl>

      <div className="mt-5 grid gap-3">
        <div className="rounded-lg border border-[#EABFB9] bg-[#fffafa] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7F533E]">
                Compatibility
              </p>
              {compatibilityResult ? (
                <p className="mt-1 font-display text-3xl font-bold leading-none text-[#901214]">
                  {getCompatibilityCategory(compatibilityResult.score)}
                </p>
              ) : (
                <p className="mt-2 text-sm font-bold leading-5 text-[#901214]">
                  Run compatibility to view score
                </p>
              )}
            </div>
            {compatibilityResult ? (
              <button
                aria-label={`View compatibility details for ${privatePerson.name}`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#C07771] bg-[#fafafa] text-[#901214] transition hover:border-[#901214]"
                type="button"
                onClick={onDetails}
              >
                <DetailsIcon />
              </button>
            ) : null}
          </div>

          {compatibilityResult ? (
            <CompatibilityScoreLine
              className="mt-3"
              label="Compatibility Score"
              score={compatibilityResult.score}
            />
          ) : (
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[rgba(144,18,20,0.1)]">
              <div className="h-full w-0 rounded-full bg-[#901214]" />
            </div>
          )}
        </div>

        <button
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#901214] px-4 text-xs font-bold text-white transition hover:bg-[#961116] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isChecking}
          type="button"
          onClick={onCheckCompatibility}
        >
          {isChecking ? "Checking..." : "Check Compatibility"}
        </button>
      </div>
    </article>
  );
}
