import Link, { type LinkProps } from "next/link";
import type { ComponentPropsWithoutRef, HTMLAttributes, PropsWithChildren, ReactNode } from "react";
import { cn } from "@/lib/cn";

export const designSystem = {
  label:
    "text-[11px] font-semibold uppercase tracking-[0.24em] text-foreground/45",
  eyebrow: "text-[11px] font-semibold uppercase tracking-[0.28em] text-accent",
  body: "text-sm leading-7 text-foreground/68",
  surface:
    "rounded-[1.85rem] border border-[rgba(144,18,20,0.1)] bg-[linear-gradient(180deg,rgba(250,250,250,0.92)_0%,rgba(245,213,200,0.68)_100%)] p-5 shadow-[0_18px_40px_rgba(12,13,10,0.08)]",
  surfaceInteractive:
    "rounded-[1.85rem] border border-[rgba(144,18,20,0.1)] bg-[linear-gradient(180deg,rgba(250,250,250,0.92)_0%,rgba(245,213,200,0.68)_100%)] p-5 shadow-[0_18px_40px_rgba(12,13,10,0.08)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_26px_60px_rgba(12,13,10,0.12)]",
  inset:
    "rounded-[1.5rem] border border-[rgba(144,18,20,0.08)] bg-[linear-gradient(180deg,rgba(250,250,250,0.74)_0%,rgba(234,191,185,0.38)_100%)]",
  tile: "rounded-[1.4rem] border border-white/60 bg-[rgba(234,191,185,0.46)] p-4",
  selectedCard:
    "border-accent bg-[linear-gradient(180deg,rgba(250,250,250,0.96)_0%,rgba(245,213,200,0.85)_100%)] shadow-[0_18px_40px_rgba(12,13,10,0.12)]",
  unselectedCard:
    "border-[rgba(144,18,20,0.08)] bg-[#fafafa]/70 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_18px_40px_rgba(12,13,10,0.08)]",
  emptyState:
    "rounded-[1.75rem] border border-dashed border-[rgba(144,18,20,0.12)] bg-[#fafafa]/64 p-8 text-sm leading-6 text-foreground/60",
  alert:
    "rounded-[1.35rem] border border-[#eabfb9] bg-[#f5d5c8] px-4 py-3 text-sm text-[#901214]",
  hero:
    "relative overflow-hidden rounded-[2.25rem] border border-[rgba(144,18,20,0.14)] bg-[linear-gradient(135deg,rgba(144,18,20,0.96)_0%,rgba(162,46,52,0.92)_58%,rgba(127,83,62,0.95)_100%)] text-white shadow-[0_35px_90px_rgba(12,13,10,0.22)]",
  authFrame:
    "grid w-full max-w-5xl overflow-hidden rounded-[2.4rem] border border-[rgba(144,18,20,0.1)] bg-[rgba(250,250,250,0.88)] shadow-[0_35px_90px_rgba(12,13,10,0.16)] backdrop-blur-xl",
  authPanel:
    "relative overflow-hidden bg-[linear-gradient(160deg,#901214_0%,#a22e34_52%,#7f533e_100%)] p-10 text-white",
} as const;

export function MetricTile({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(designSystem.inset, "p-5", className)}>
      <p className={designSystem.label}>{label}</p>
      <p className="mt-3 font-display text-5xl font-semibold text-primary">{value}</p>
    </div>
  );
}

export function EmptyState({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return <div className={cn(designSystem.emptyState, className)}>{children}</div>;
}

export function AlertMessage({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return <div className={cn(designSystem.alert, className)}>{children}</div>;
}

export function InfoTile({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return <div className={cn(designSystem.tile, className)}>{children}</div>;
}

export function SelectCard({
  active = false,
  className,
  ...props
}: ComponentPropsWithoutRef<"button"> & { active?: boolean }) {
  return (
    <button
      className={cn(
        "group relative overflow-hidden rounded-[1.65rem] border p-5 text-left transition duration-200",
        active ? designSystem.selectedCard : designSystem.unselectedCard,
        className,
      )}
      {...props}
    />
  );
}

export function SelectionPanel({
  active = false,
  className,
  ...props
}: ComponentPropsWithoutRef<"label"> & { active?: boolean }) {
  return (
    <label
      className={cn(
        "group flex cursor-pointer gap-4 rounded-[1.65rem] border p-5 transition duration-200",
        active ? designSystem.selectedCard : designSystem.unselectedCard,
        className,
      )}
      {...props}
    />
  );
}

export function ActionLink({
  className,
  variant = "secondary",
  ...props
}: LinkProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, keyof LinkProps> & {
    variant?: "primary" | "secondary";
  }) {
  return (
    <Link
      className={cn(
        "inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-medium transition",
        variant === "primary"
          ? "bg-primary text-white hover:bg-[#961116]"
          : "border border-black/10 bg-[#fafafa] px-4 py-3 text-foreground hover:border-accent hover:text-accent",
        className,
      )}
      {...props}
    />
  );
}

export function AuthShell({
  children,
  hero,
  reverseOnDesktop = false,
}: {
  children: ReactNode;
  hero: ReactNode;
  reverseOnDesktop?: boolean;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section
        className={cn(
          designSystem.authFrame,
          reverseOnDesktop
            ? "lg:grid-cols-[0.95fr_1.05fr]"
            : "lg:grid-cols-[1.05fr_0.95fr]",
        )}
      >
        {!reverseOnDesktop ? hero : null}
        <div className="p-8 sm:p-10">{children}</div>
        {reverseOnDesktop ? hero : null}
      </section>
    </main>
  );
}

export function AuthHero({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow: string;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div className={cn(designSystem.authPanel, "hidden lg:block", className)}>
      <div className="absolute left-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(234,191,185,0.32),transparent_70%)]" />
      <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.08),transparent_70%)]" />
      <p className="relative text-[11px] font-semibold uppercase tracking-[0.34em] text-[rgba(245,213,200,0.94)]">
        {eyebrow}
      </p>
      <h2 className="relative mt-8 max-w-sm font-display text-6xl font-semibold leading-none tracking-tight">
        {title}
      </h2>
      <p className="relative mt-6 max-w-md text-sm leading-7 text-white/72">{description}</p>
    </div>
  );
}

export function HeroSection({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return <section className={cn(designSystem.hero, className)}>{children}</section>;
}

export function BodyText({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn(designSystem.body, className)} {...props} />;
}
