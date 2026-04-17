"use client";

import { isAxiosError } from "axios";
import Link from "next/link";
import { useState, useTransition } from "react";
import { AlertMessage, AuthHero, AuthShell, BodyText } from "@/components/ui/design-system";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authService } from "@/services/authService";
import type { ApiErrorResponse } from "@/types/common";

const extractAuthErrorMessage = (error: unknown, fallback: string) => {
  if (isAxiosError<ApiErrorResponse | Record<string, string[]>>(error)) {
    const data = error.response?.data;

    if (data && typeof data === "object") {
      if ("message" in data && typeof data.message === "string") {
        return data.message;
      }

      if ("detail" in data && typeof data.detail === "string") {
        return data.detail;
      }

      const fieldErrors = Object.entries(data)
        .flatMap(([, value]) => (Array.isArray(value) ? value : []))
        .filter((value): value is string => typeof value === "string");

      if (fieldErrors.length > 0) {
        return fieldErrors[0];
      }
    }
  }

  return fallback;
};

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const registeredEmail = email.trim();

    if (!registeredEmail) {
      setError("Registered email is required.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registeredEmail)) {
      setError("Enter a valid registered email address.");
      return;
    }

    startTransition(() => {
      void (async () => {
        try {
          const response = await authService.forgotPassword({
            email: registeredEmail,
          });
          setMessage(
            response.message ||
              response.detail ||
              "If this registered email exists, password reset instructions have been sent.",
          );
        } catch (error) {
          setError(
            extractAuthErrorMessage(
              error,
              "Unable to send password reset instructions right now.",
            ),
          );
        }
      })();
    });
  };

  return (
    <AuthShell
      hero={
        <AuthHero
          eyebrow="Account Recovery"
          title="Return to your matchmaking workspace."
          description="Use your registered email to request password reset instructions and regain access to your private profiles and compatibility runs."
        />
      }
    >
          <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-accent">
            Password Reset
          </p>
          <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight text-primary">
            Forgot password
          </h1>
          <BodyText className="mt-4">
            Enter the registered email for your account.
          </BodyText>

          <form className="mt-10 space-y-5" onSubmit={handleSubmit}>
            <Input
              required
              label="Registered email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            {error ? <AlertMessage>{error}</AlertMessage> : null}
            {message ? (
              <AlertMessage className="border-[#eabfb9] bg-[#fafafa] text-[#7f533e]">
                {message}
              </AlertMessage>
            ) : null}

            <Button type="submit" disabled={isPending} className="w-full py-3.5">
              {isPending ? "Sending..." : "Send reset instructions"}
            </Button>
          </form>

          <p className="mt-8 text-sm text-foreground/68">
            Remembered your password?{" "}
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
