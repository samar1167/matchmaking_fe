import type { InputHTMLAttributes } from "react";
import { designSystem } from "@/components/ui/design-system";
import { cn } from "@/lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label: string;
}

export function Input({ error, label, className = "", ...props }: InputProps) {
  return (
    <label className="block">
      <span className={cn("mb-2 block", designSystem.label)}>{label}</span>
      <input
        className={cn(
          "w-full rounded-[1.35rem] border bg-white/82 px-4 py-3.5 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] outline-none transition duration-200 placeholder:text-foreground/35 focus:-translate-y-px focus:border-accent focus:bg-white focus:shadow-[0_14px_34px_rgba(29,18,55,0.08)]",
          error ? "border-red-300" : "border-[rgba(49,36,87,0.12)]",
          className,
        )}
        {...props}
      />
      {error ? <span className="mt-2 block text-sm text-[#a1294b]">{error}</span> : null}
    </label>
  );
}
