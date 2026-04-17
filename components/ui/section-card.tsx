import type { PropsWithChildren, ReactNode } from "react";
import { designSystem } from "@/components/ui/design-system";

interface SectionCardProps extends PropsWithChildren {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function SectionCard({
  actions,
  children,
  description,
  eyebrow,
  title,
}: SectionCardProps) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-[rgba(144,18,20,0.1)] bg-[linear-gradient(180deg,rgba(250,250,250,0.94)_0%,rgba(245,213,200,0.72)_100%)] p-6 shadow-[0_28px_70px_rgba(12,13,10,0.1)] backdrop-blur-xl sm:p-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(192,119,113,0.74),transparent)]" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {eyebrow ? (
            <p className={designSystem.eyebrow}>{eyebrow}</p>
          ) : null}
          <h2 className="mt-3 font-display text-3xl font-semibold leading-none tracking-tight text-primary">
            {title}
          </h2>
          {description ? (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-foreground/68">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className="mt-8">{children}</div>
    </section>
  );
}
