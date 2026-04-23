import type { ReactNode } from "react";
import { HeroSection } from "@/components/ui/design-system";

interface AppScaffoldProps {
  title: string;
  description: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function AppScaffold({
  actions,
  children,
  description,
  eyebrow = "Matchmaking",
  title,
}: AppScaffoldProps) {
  return (
    <main className="min-h-screen p-6 sm:p-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <HeroSection className="p-6 sm:p-8">
          <div className="pointer-events-none absolute -left-20 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(234,191,185,0.32),transparent_70%)]" />
          <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.1),transparent_70%)]" />
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[rgba(245,213,200,0.92)]">
                {eyebrow}
              </p>
              <h1 className="mt-5 max-w-3xl font-display text-5xl font-semibold tracking-tight text-white sm:text-6xl">
                {title}
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/74 sm:text-base">
                {description}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {actions}
            </div>
          </div>
        </HeroSection>
        {children}
      </div>
    </main>
  );
}
