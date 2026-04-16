"use client";

import { isAxiosError } from "axios";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AlertMessage, AuthHero, AuthShell, BodyText } from "@/components/ui/design-system";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authService } from "@/services/authService";
import type { ApiErrorResponse } from "@/types/common";

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

const extractAuthErrorMessage = (error: unknown, fallback: string) => {
  if (isAxiosError<ServerMessagePayload>(error)) {
    return getServerMessage(error.response?.data) || fallback;
  }

  return fallback;
};

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token")?.trim() || "", [searchParams]);
  const isMountedRef = useRef(true);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(
    token ? null : "This reset link is missing a token. Request a new password reset link.",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setMessage(null);
    setError(
      token ? null : "This reset link is missing a token. Request a new password reset link.",
    );
  }, [token]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!token) {
      setError("This reset link is missing a token. Request a new password reset link.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation must match.");
      return;
    }

    startTransition(() => {
      void (async () => {
        try {
          const response = await authService.resetPassword({
            token,
            new_password: newPassword,
          });

          if (!isMountedRef.current) {
            return;
          }

          setMessage(
            getServerMessage(response) ||
              "Password reset successfully.",
          );
          setNewPassword("");
          setConfirmPassword("");
        } catch (error) {
          if (!isMountedRef.current) {
            return;
          }

          setError(
            extractAuthErrorMessage(
              error,
              "Unable to reset your password. Request a new reset link and try again.",
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
          title="Create a new password."
          description="Complete the reset from your secure email link, then return to sign in with your updated account credentials."
        />
      }
    >
          <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-accent">
            Password Reset
          </p>
          <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight text-primary">
            Reset password
          </h1>
          <BodyText className="mt-4">
            Choose a new password with at least eight characters.
          </BodyText>

          <form className="mt-10 space-y-5" onSubmit={handleSubmit}>
            <Input
              required
              label="New password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              disabled={!token || isPending || Boolean(message)}
              onChange={(event) => setNewPassword(event.target.value)}
            />
            <Input
              required
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              disabled={!token || isPending || Boolean(message)}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />

            {error ? <AlertMessage>{error}</AlertMessage> : null}
            {message ? (
              <AlertMessage className="border-[#bcdcc8] bg-[#eefbf1] text-[#1e6b39]">
                {message}
              </AlertMessage>
            ) : null}

            <Button
              type="submit"
              disabled={!token || isPending || Boolean(message)}
              className="w-full py-3.5"
            >
              {isPending ? "Resetting..." : "Reset password"}
            </Button>
          </form>

          {message ? (
            <div className="mt-5 space-y-4">
              <p className="text-sm leading-7 text-foreground/68">
                Please login with your new password.
              </p>
              <Link
                className="inline-flex w-full items-center justify-center rounded-full border border-[#22163a] bg-[linear-gradient(135deg,#3d2d6d_0%,#24173f_100%)] px-5 py-3.5 text-sm font-semibold tracking-[0.02em] text-white shadow-[0_16px_34px_rgba(36,23,63,0.26)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_44px_rgba(36,23,63,0.3)]"
                href="/login"
              >
                Go to login
              </Link>
            </div>
          ) : null}

          <p className="mt-8 text-sm leading-7 text-foreground/68">
            Need a fresh link?{" "}
            <Link
              className="font-semibold text-primary transition hover:text-accent"
              href="/forgot-password"
            >
              Request password reset
            </Link>
            . Already reset it?{" "}
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
