"use client";

import { Button } from "@/components/ui/button";
import { InfoTile, designSystem } from "@/components/ui/design-system";
import type { PrivatePerson } from "@/types/private-persons";

interface PrivatePersonCardProps {
  isDeleting?: boolean;
  onDelete: () => void;
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

export function PrivatePersonCard({
  isDeleting = false,
  onDelete,
  onEdit,
  privatePerson,
}: PrivatePersonCardProps) {
  return (
    <article className={`group ${designSystem.surfaceInteractive}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={designSystem.eyebrow}>Private Person</p>
          <h3 className="mt-3 font-display text-3xl font-semibold tracking-tight text-primary">
            {privatePerson.name}
          </h3>
        </div>
        <div className="flex gap-2">
          <Button onClick={onEdit} variant="secondary">
            Edit
          </Button>
          <Button disabled={isDeleting} onClick={onDelete} variant="danger">
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>

      <dl className="mt-6 grid gap-4 sm:grid-cols-3">
        <InfoTile>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.24em] text-foreground/45">
            Date of birth
          </dt>
          <dd className="mt-3 text-sm font-semibold text-primary">
            {formatDate(privatePerson.date_of_birth)}
          </dd>
        </InfoTile>
        <InfoTile>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.24em] text-foreground/45">
            Time of birth
          </dt>
          <dd className="mt-3 text-sm font-semibold text-primary">
            {privatePerson.time_of_birth}
          </dd>
        </InfoTile>
        <InfoTile className="sm:col-span-3">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.24em] text-foreground/45">
            Place of birth
          </dt>
          <dd className="mt-3 text-sm font-semibold text-primary">
            {privatePerson.place_of_birth}
          </dd>
        </InfoTile>
      </dl>
    </article>
  );
}
