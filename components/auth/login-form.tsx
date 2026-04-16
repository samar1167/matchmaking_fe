"use client";

import { isAxiosError } from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AuthHero, AuthShell, AlertMessage, BodyText } from "@/components/ui/design-system";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authService } from "@/services/authService";
import { useAuthStore } from "@/store/authStore";
import type { LoginRequest } from "@/types/auth";
import type { ApiErrorResponse } from "@/types/common";

const initialValues: LoginRequest = {
  email: "",
  password: "",
};

type ServerMessagePayload =
  | ApiErrorResponse
  | string
  | string[]
  | Record<string, string | string[] | Record<string, string[]>>;

const getServerMessage = (payload: ServerMessagePayload | undefined) => {
  if (!payload) {
    return null;
  }

  if (typeof payload === "string") {
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.find((value): value is string => typeof value === "string") || null;
  }

  if (typeof payload !== "object") {
    return null;
  }

  if ("message" in payload && typeof payload.message === "string") {
    return payload.message;
  }

  if ("detail" in payload && typeof payload.detail === "string") {
    return payload.detail;
  }

  if ("error" in payload && typeof payload.error === "string") {
    return payload.error;
  }

  if ("details" in payload && payload.details && typeof payload.details === "object") {
    const detailError = Object.values(payload.details)
      .flatMap((value) => (Array.isArray(value) ? value : []))
      .find((value): value is string => typeof value === "string");

    if (detailError) {
      return detailError;
    }
  }

  const fieldError = Object.values(payload)
    .flatMap((value) => {
      if (typeof value === "string") {
        return [value];
      }

      if (Array.isArray(value)) {
        return value;
      }

      return [];
    })
    .find((value): value is string => typeof value === "string");

  return fieldError || null;
};

const extractLoginErrorMessage = (error: unknown, fallback: string) => {
  if (isAxiosError<ServerMessagePayload>(error)) {
    return getServerMessage(error.response?.data) || fallback;
  }

  return fallback;
};

export function LoginForm() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [form, setForm] = useState<LoginRequest>(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleChange = (field: keyof LoginRequest, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(() => {
      void (async () => {
        try {
          const response = await authService.login(form);
          setSession({
            user: null,
            token: response.access,
            refreshToken: response.refresh,
          });
          router.replace("/dashboard");
        } catch (error) {
          setError(
            extractLoginErrorMessage(
              error,
              "Unable to sign in with the provided credentials.",
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
          eyebrow="Matchmaking"
          title="Align with the right connection."
          description="Enter your account to continue reviewing private profiles, compatibility runs, and premium parameter insights in one place."
        />
      }
    >
          <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-accent">
            Secure Access
          </p>
          <h2 className="mt-4 font-display text-5xl font-semibold tracking-tight text-primary">
            Login
          </h2>
          <BodyText className="mt-4">Access your account and restore your session.</BodyText>

          <form className="mt-10 space-y-5" onSubmit={handleSubmit}>
            <Input
              required
              label="Email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) => handleChange("email", event.target.value)}
            />
            <Input
              required
              label="Password"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={(event) => handleChange("password", event.target.value)}
            />

            {error ? <AlertMessage>{error}</AlertMessage> : null}

            <Button type="submit" disabled={isPending} className="w-full py-3.5">
              {isPending ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <Link
            className="mt-5 inline-block text-sm font-semibold text-primary transition hover:text-accent"
            href="/forgot-password"
          >
            Forgot password?
          </Link>

          <p className="mt-8 text-sm text-foreground/68">
            No account yet?{" "}
            <Link
              className="font-semibold text-primary transition hover:text-accent"
              href="/register"
            >
              Create one
            </Link>
          </p>
    </AuthShell>
  );
}
