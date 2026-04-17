import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps
  extends PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-[#7f533e] bg-[linear-gradient(135deg,#a22e34_0%,#901214_100%)] text-white shadow-[0_16px_34px_rgba(144,18,20,0.24)] hover:-translate-y-0.5 hover:shadow-[0_24px_44px_rgba(144,18,20,0.28)] disabled:border-[#b2806b] disabled:shadow-none",
  secondary:
    "border border-[rgba(144,18,20,0.14)] bg-[#fafafa]/90 text-foreground shadow-[0_10px_24px_rgba(12,13,10,0.06)] hover:-translate-y-0.5 hover:border-accent hover:text-primary",
  ghost:
    "bg-transparent text-foreground/72 hover:bg-[rgba(144,18,20,0.07)] hover:text-foreground",
  danger:
    "border border-[#901214] bg-[linear-gradient(135deg,#961116_0%,#901214_100%)] text-white shadow-[0_16px_32px_rgba(144,18,20,0.2)] hover:-translate-y-0.5 hover:shadow-[0_20px_42px_rgba(144,18,20,0.24)]",
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
