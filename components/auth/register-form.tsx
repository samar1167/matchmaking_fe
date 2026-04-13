"use client";

import { isAxiosError } from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertMessage, AuthHero, AuthShell, BodyText } from "@/components/ui/design-system";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authService } from "@/services/authService";
import type { ApiErrorResponse } from "@/types/common";
import type { RegisterRequest } from "@/types/auth";

type RegisterFormValues = RegisterRequest & {
  confirmPassword: string;
};

const initialValues: RegisterFormValues = {
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState<RegisterFormValues>(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleChange = (field: keyof RegisterFormValues, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const username = form.username.trim();
    const email = form.email?.trim() ?? "";
    const password = form.password;

    if (!username) {
      setError("Username is required.");
      return;
    }

    if (!/^[\w.@+-]+$/.test(username)) {
      setError("Username may only contain letters, digits, and @/./+/-/_.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Password and confirmation must match.");
      return;
    }

    startTransition(() => {
      void (async () => {
        try {
          await authService.register({
            username,
            ...(email ? { email } : {}),
            password,
          });
          router.replace("/login");
        } catch (error) {
          if (isAxiosError<ApiErrorResponse | Record<string, string[]>>(error)) {
            const data = error.response?.data;

            if (data && typeof data === "object") {
              if ("message" in data && typeof data.message === "string") {
                setError(data.message);
                return;
              }

              const fieldErrors = Object.entries(data)
                .flatMap(([, value]) => (Array.isArray(value) ? value : []))
                .filter((value): value is string => typeof value === "string");

              if (fieldErrors.length > 0) {
                setError(fieldErrors[0]);
                return;
              }
            }
          }

          setError("Unable to create the account with the provided details.");
        }
      })();
    });
  };

  return (
    <AuthShell
      reverseOnDesktop
      hero={
        <AuthHero
          eyebrow="Premium Astrology"
          title="Build a deeper compatibility library."
          description="Store private profiles, compare them against your own chart, and move into a more refined matchmaking workflow designed for clarity."
        />
      }
    >
          <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-accent">
            New Account
          </p>
          <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight text-primary">
            Register
          </h1>
          <BodyText className="mt-4">
            Create an account to manage profiles, review matches, and unlock premium
            compatibility layers.
          </BodyText>

          <form className="mt-10 space-y-5" onSubmit={handleSubmit}>
            <Input
              required
              label="Username"
              type="text"
              value={form.username}
              onChange={(event) => handleChange("username", event.target.value)}
            />
            <Input
              label="Email (optional)"
              type="email"
              value={form.email}
              onChange={(event) => handleChange("email", event.target.value)}
            />
            <Input
              required
              label="Password"
              type="password"
              value={form.password}
              onChange={(event) => handleChange("password", event.target.value)}
            />
            <Input
              required
              label="Confirm password"
              type="password"
              value={form.confirmPassword}
              onChange={(event) => handleChange("confirmPassword", event.target.value)}
            />

            {error ? <AlertMessage>{error}</AlertMessage> : null}

            <Button type="submit" disabled={isPending} className="w-full py-3.5">
              {isPending ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <p className="mt-8 text-sm leading-7 text-foreground/68">
            Registration redirects to sign in after success. Already registered?{" "}
            <Link
              className="font-semibold text-primary transition hover:text-accent"
              href="/login"
            >
              Sign in
            </Link>
          </p>
    </AuthShell>
  );
}
