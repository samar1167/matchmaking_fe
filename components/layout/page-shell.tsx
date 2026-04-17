import { LogoutButton } from "@/components/auth/logout-button";
import { HeroSection } from "@/components/ui/design-system";

type PageShellProps = {
  title: string;
  description: string;
};

export function PageShell({ title, description }: PageShellProps) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <HeroSection className="w-full max-w-3xl p-10">
        <div className="pointer-events-none absolute -left-16 top-0 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(234,191,185,0.3),transparent_70%)]" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[rgba(245,213,200,0.92)]">
              Matchmaking
            </p>
            <h1 className="mt-5 font-display text-5xl font-semibold tracking-tight text-white">
              {title}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-white/74">{description}</p>
          </div>
          <div className="shrink-0">
            <LogoutButton />
          </div>
        </div>
      </HeroSection>
    </main>
  );
}
