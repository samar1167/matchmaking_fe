"use client";

import { isAxiosError } from "axios";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AlertMessage, AuthHero, AuthShell, BodyText } from "@/components/ui/design-system";
import { Button } from "@/components/ui/button";
import { authService } from "@/services/authService";
import type { AuthActionResponse, VerifyEmailRequest } from "@/types/auth";
import type { ApiErrorResponse } from "@/types/common";

type ServerMessagePayload =
  | ApiErrorResponse
  | string
  | string[]
  | Record<string, string | string[] | Record<string, string[]>>;

const successAlertClass = "border-[#eabfb9] bg-[#fafafa] text-[#7f533e]";
const verificationRequests = new Map<string, Promise<AuthActionResponse>>();

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

const setPayloadValue = (
  payload: VerifyEmailRequest,
  key: keyof VerifyEmailRequest,
  value: string | null,
) => {
  const normalizedValue = value?.trim();

  if (normalizedValue) {
    payload[key] = normalizedValue;
  }
};

const getVerificationPayload = (searchParams: URLSearchParams) => {
  const payload: VerifyEmailRequest = {};

  setPayloadValue(payload, "token", searchParams.get("token"));
  setPayloadValue(payload, "key", searchParams.get("key"));
  setPayloadValue(payload, "code", searchParams.get("code"));
  setPayloadValue(payload, "uid", searchParams.get("uid") || searchParams.get("user_id"));
  setPayloadValue(payload, "uidb64", searchParams.get("uidb64"));
  setPayloadValue(payload, "email", searchParams.get("email"));

  return payload;
};

const verifyEmailOnce = (
  cacheKey: string,
  payload: VerifyEmailRequest,
  forceNewRequest: boolean,
) => {
  if (forceNewRequest) {
    verificationRequests.delete(cacheKey);
  }

  const cachedRequest = verificationRequests.get(cacheKey);

  if (cachedRequest) {
    return cachedRequest;
  }

  const request = authService.verifyEmail(payload);
  verificationRequests.set(cacheKey, request);

  return request;
};

export function VerifyEmailHandler() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  const payload = useMemo(
    () => getVerificationPayload(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const serializedPayload = useMemo(() => JSON.stringify(payload), [payload]);
  const hasVerifier = Boolean(payload.token || payload.key || payload.code);

  useEffect(() => {
    let isMounted = true;

    setError(null);
    setMessage(null);

    if (!hasVerifier) {
      setIsVerifying(false);
      setError("This verification link is missing a token. Request a new verification email.");
      return () => {
        isMounted = false;
      };
    }

    setIsVerifying(true);

    void (async () => {
      try {
        const response = await verifyEmailOnce(
          serializedPayload,
          JSON.parse(serializedPayload),
          retryCount > 0,
        );

        if (!isMounted) {
          return;
        }

        setMessage(
          getServerMessage(response) || "Email verified successfully. You can now login.",
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setError(
          extractAuthErrorMessage(
            error,
            "Unable to verify this email link. Request a new verification email and try again.",
          ),
        );
      } finally {
        if (isMounted) {
          setIsVerifying(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [hasVerifier, retryCount, serializedPayload]);

  return (
    <AuthShell
      hero={
        <AuthHero
          eyebrow="Email Verification"
          title="Confirm your account email."
          description="We verify your secure email link before opening login access to your matchmaking workspace."
        />
      }
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-accent">
        Account Verification
      </p>
      <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight text-primary">
        Verify email
      </h1>
      <BodyText className="mt-4">
        {isVerifying
          ? "Checking your verification link."
          : message
            ? "Your email address is confirmed."
            : "We could not complete email verification."}
      </BodyText>

      <div className="mt-10 space-y-5">
        {isVerifying ? (
          <AlertMessage className="border-[rgba(144,18,20,0.14)] bg-[#fafafa]/70 text-foreground/70">
            Verifying your email...
          </AlertMessage>
        ) : null}
        {error ? <AlertMessage>{error}</AlertMessage> : null}
        {message ? (
          <AlertMessage className={successAlertClass}>{message}</AlertMessage>
        ) : null}

        {message ? (
          <Link
            className="inline-flex w-full items-center justify-center rounded-full border border-[#7f533e] bg-[linear-gradient(135deg,#a22e34_0%,#901214_100%)] px-5 py-3.5 text-sm font-semibold tracking-[0.02em] text-white shadow-[0_16px_34px_rgba(144,18,20,0.24)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_44px_rgba(144,18,20,0.28)]"
            href="/login"
          >
            Go to login
          </Link>
        ) : null}

        {error && hasVerifier ? (
          <Button
            className="w-full py-3.5"
            disabled={isVerifying}
            onClick={() => setRetryCount((current) => current + 1)}
            type="button"
          >
            Try verification again
          </Button>
        ) : null}
      </div>

      <p className="mt-8 text-sm leading-7 text-foreground/68">
        Already verified?{" "}
        <Link className="font-semibold text-primary transition hover:text-accent" href="/login">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
