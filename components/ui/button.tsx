import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps
  extends PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-[#22163a] bg-[linear-gradient(135deg,#3d2d6d_0%,#24173f_100%)] text-white shadow-[0_16px_34px_rgba(36,23,63,0.26)] hover:-translate-y-0.5 hover:shadow-[0_24px_44px_rgba(36,23,63,0.3)] disabled:border-[#3d2d6d] disabled:shadow-none",
  secondary:
    "border border-[rgba(49,36,87,0.14)] bg-white/80 text-foreground shadow-[0_10px_24px_rgba(29,18,55,0.06)] hover:-translate-y-0.5 hover:border-accent hover:text-primary",
  ghost:
    "bg-transparent text-foreground/72 hover:bg-[rgba(49,36,87,0.06)] hover:text-foreground",
  danger:
    "border border-[#6e1830] bg-[linear-gradient(135deg,#8f2343_0%,#64172f_100%)] text-white shadow-[0_16px_32px_rgba(100,23,47,0.2)] hover:-translate-y-0.5 hover:shadow-[0_20px_42px_rgba(100,23,47,0.24)]",
};

export function Button({
  children,
  className = "",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold tracking-[0.02em] transition duration-200 disabled:cursor-not-allowed disabled:opacity-60",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
