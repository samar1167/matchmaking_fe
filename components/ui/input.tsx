import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { designSystem } from "@/components/ui/design-system";
import { cn } from "@/lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label: string;
}

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  label: string;
  options: Array<{
    label: string;
    value: string;
  }>;
  placeholder?: string;
}

export function Input({ error, label, className = "", ...props }: InputProps) {
  return (
    <label className="block">
      <span className={cn("mb-2 block", designSystem.label)}>{label}</span>
      <input
        className={cn(
          "w-full rounded-[1.35rem] border bg-[#fafafa]/90 px-4 py-3.5 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] outline-none transition duration-200 placeholder:text-foreground/35 focus:-translate-y-px focus:border-accent focus:bg-[#fafafa] focus:shadow-[0_14px_34px_rgba(12,13,10,0.08)]",
          error ? "border-[#a22e34]" : "border-[rgba(144,18,20,0.12)]",
          className,
        )}
        {...props}
      />
      {error ? <span className="mt-2 block text-sm text-[#901214]">{error}</span> : null}
    </label>
  );
}

export function SelectInput({
  error,
  label,
  options,
  placeholder = "Select an option",
  className = "",
  ...props
}: SelectInputProps) {
  return (
    <label className="block">
      <span className={cn("mb-2 block", designSystem.label)}>{label}</span>
      <select
        className={cn(
          "w-full rounded-[1.35rem] border bg-[#fafafa]/90 px-4 py-3.5 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] outline-none transition duration-200 focus:-translate-y-px focus:border-accent focus:bg-[#fafafa] focus:shadow-[0_14px_34px_rgba(12,13,10,0.08)]",
          error ? "border-[#a22e34]" : "border-[rgba(144,18,20,0.12)]",
          className,
        )}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <span className="mt-2 block text-sm text-[#901214]">{error}</span> : null}
    </label>
  );
}
