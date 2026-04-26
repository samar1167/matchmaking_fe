"use client";

import { isAxiosError } from "axios";
import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";
import { useEffect, useMemo, useState } from "react";
import { ChatDialog } from "@/components/chat/chat-dialog";
import { SiteFooter } from "@/components/layout/site-footer";
import {
  CompatibilityScoreLine,
  getCompatibilityCategory,
  getScoreOnTen,
  isNumericCompatibilityValue,
} from "@/components/ui/compatibility-score";
import { useChatConversationUnreadCounts } from "@/hooks/useChatNotifications";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { cn } from "@/lib/cn";
import { compatibilityService } from "@/services/compatibilityService";
import { normalizeCompatibilityResults } from "@/services/compatibilityMapper";
import { connectionService } from "@/services/connectionService";
import { profileService } from "@/services/profileService";
import { useAuthStore } from "@/store/authStore";
import { useResultsStore, type StoredCompatibilityResult } from "@/store/resultsStore";
import { userMatchService } from "@/services/userMatchService";
import type { ApiErrorResponse } from "@/types/common";
import type { Connection } from "@/types/connection";
import type { PlanParameters } from "@/types/plan";
import type { UserProfile } from "@/types/profile";
import type { UserMatch } from "@/types/user-match";

type ConnectionAction = "accept" | "decline" | "cancel" | "disconnect";
type ServerMessagePayload =
  | ApiErrorResponse
  | string
  | string[]
  | Record<string, string | string[] | Record<string, string[]>>;

const pageSize = 5;

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

  if ("message" in payload && typeof payload.message === "string") {
    return payload.message;
  }

  if ("detail" in payload && typeof payload.detail === "string") {
    return payload.detail;
  }

  if ("error" in payload && typeof payload.error === "string") {
    return payload.error;
  }

  return null;
};

const extractActionErrorMessage = (error: unknown, fallback: string) => {
  if (isAxiosError<ServerMessagePayload>(error)) {
    return getServerMessage(error.response?.data) || fallback;
  }

  return fallback;
};

const formatTimestamp = (value?: string | null) => {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const getProfileDisplayName = (profile?: UserProfile | null) => {
  if (!profile) {
    return "Unknown profile";
  }

  const firstName = profile.first_name ?? profile.user?.first_name ?? "";
  const lastName = profile.last_name ?? profile.user?.last_name ?? "";
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || profile.user?.username || `Profile #${profile.id}`;
};

const getProfileInitials = (profile?: UserProfile | null) => {
  const name = getProfileDisplayName(profile);
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return initials || "CN";
};

const getProfileImageUrl = (profile?: UserProfile | null) =>
  profile?.profile_picture ?? profile?.user?.profile_picture ?? null;

const getConnectionPeer = (connection: Connection, currentProfileId?: number) => {
  if (connection.requester && connection.receiver) {
    if (!currentProfileId) {
      return connection.requester;
    }

    return connection.requester.id === currentProfileId
      ? connection.receiver
      : connection.requester;
  }

  if (connection.profile_low && connection.profile_high) {
    if (!currentProfileId) {
      return connection.profile_low;
    }

    return connection.profile_low.id === currentProfileId
      ? connection.profile_high
      : connection.profile_low;
  }

  if (connection.requester) {
    return connection.requester;
  }

  if (connection.receiver) {
    return connection.receiver;
  }

  return connection;
};

const getConnectionForProfile = (
  connections: Connection[],
  profileId?: number | string,
) => {
  if (!profileId) {
    return null;
  }

  const targetProfileId = String(profileId);

  return (
    connections.find(
      (connection) =>
        String(connection.id) === targetProfileId ||
        String(connection.requester?.id) === targetProfileId ||
        String(connection.receiver?.id) === targetProfileId ||
        String(connection.profile_low?.id) === targetProfileId ||
        String(connection.profile_high?.id) === targetProfileId,
    ) ?? null
  );
};

const withDefaultStatus = (
  connections: Connection[],
  status: Connection["status"],
) => connections.map((connection) => ({ ...connection, status: connection.status ?? status }));

const getPageCount = (itemCount: number) => Math.max(1, Math.ceil(itemCount / pageSize));

const getCompatibilityProfileId = (result: StoredCompatibilityResult) => {
  const raw = result.raw;

  if (raw.is_private_match === true) {
    return null;
  }

  const profileId =
    raw.matched_user ??
    raw.matched_user_id ??
    raw.target_profile_id ??
    raw.profile_id ??
    raw.person_id;

  if (profileId === null || profileId === undefined) {
    return null;
  }

  return String(profileId);
};

const getCreatedAtTime = (result: StoredCompatibilityResult) => {
  if (!result.createdAt) {
    return 0;
  }

  const time = new Date(result.createdAt).getTime();

  return Number.isNaN(time) ? 0 : time;
};

const buildCompatibilityScoresByProfile = (payload: unknown) =>
  normalizeCompatibilityResults(payload).reduce<Record<string, StoredCompatibilityResult>>(
    (scoresByProfile, result) => {
      const profileId = getCompatibilityProfileId(result);

      if (!profileId) {
        return scoresByProfile;
      }

      const existingResult = scoresByProfile[profileId];

      if (!existingResult || getCreatedAtTime(result) >= getCreatedAtTime(existingResult)) {
        scoresByProfile[profileId] = result;
      }

      return scoresByProfile;
    },
    {},
  );

const isLockedParameter = (key: string, parameters: PlanParameters) => {
  const direct = parameters[key];

  if (direct && direct.paid && !direct.free) {
    return true;
  }

  const finalSegment = key.split(".").at(-1);

  if (!finalSegment) {
    return false;
  }

  const fallback = parameters[finalSegment];

  return Boolean(fallback?.paid && !fallback.free);
};

const shouldBlurParameter = (
  parameter: StoredCompatibilityResult["parameters"][number],
  parameters: PlanParameters,
) => {
  if (typeof parameter.locked === "boolean") {
    return parameter.locked;
  }

  return isLockedParameter(parameter.key, parameters);
};

const paginate = <Item,>(items: Item[], page: number) => {
  const start = (page - 1) * pageSize;

  return items.slice(start, start + pageSize);
};

function ConnectionsButton({
  children,
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  return (
    <button
      className={cn(
        "inline-flex min-h-10 items-center justify-center rounded-md px-4 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary"
          ? "bg-[#901214] text-white shadow-[0_10px_22px_rgba(144,18,20,0.12)] hover:bg-[#961116]"
          : variant === "secondary"
            ? "border border-[#C07771] bg-[#fafafa] text-[#901214] hover:border-[#901214]"
            : "bg-transparent text-[#901214] hover:bg-[#fdf1f0]",
        className,
      )}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

function ConnectionsSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#EABFB9] bg-[#fafafa] p-6 shadow-[0_14px_34px_rgba(144,18,20,0.06)]">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#A22E34]">
        {eyebrow}
      </p>
      <h2 className="mt-2 font-display text-3xl font-bold leading-tight text-[#2d1718]">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#2d1718]/70">
          {description}
        </p>
      ) : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function ConnectionsEmpty({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-[#C07771] bg-[#fffafa] p-6 text-sm leading-6 text-[#2d1718]/65",
        className,
      )}
    >
      {children}
    </div>
  );
}

function ConnectionsAlert({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[#EABFB9] bg-[#fdf1f0] px-4 py-3 text-sm font-semibold text-[#901214]">
      {children}
    </div>
  );
}

function PaginationControls({
  label,
  page,
  totalPages,
  onPageChange,
}: {
  label: string;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7F533E]">
        {label} page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <ConnectionsButton
          className="px-4 py-2 text-xs"
          disabled={page === 1}
          variant="ghost"
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Previous
        </ConnectionsButton>
        <ConnectionsButton
          className="px-4 py-2 text-xs"
          disabled={page === totalPages}
          variant="secondary"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          Next
        </ConnectionsButton>
      </div>
    </div>
  );
}

function ProfileAvatar({ profile }: { profile?: UserProfile | null }) {
  const imageUrl = getProfileImageUrl(profile);

  if (imageUrl) {
    return (
      <img
        alt=""
        className="h-12 w-12 shrink-0 rounded-full border border-[#C07771] object-cover"
        src={imageUrl}
      />
    );
  }

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#C07771] bg-[#EABFB9] text-sm font-bold text-[#901214]">
      {getProfileInitials(profile)}
    </div>
  );
}

function ChatIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M5 6.5A3.5 3.5 0 0 1 8.5 3h7A3.5 3.5 0 0 1 19 6.5v5A3.5 3.5 0 0 1 15.5 15H11l-4.5 4v-4.2A3.5 3.5 0 0 1 5 12V6.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function DisconnectIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="m8.5 15.5 7-7M9.8 7.2l-1.1-1.1a4 4 0 0 0-5.7 5.7l2.5 2.5a4 4 0 0 0 5.7 0m3-5.1a4 4 0 0 1 5.7 0l1.1 1.1a4 4 0 0 1 0 5.7l-2.5 2.5a4 4 0 0 1-5.7 0l-1.1-1.1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function DetailsIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 11v6m0-10h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function LockedParameterValue({ value }: { value: string }) {
  return (
    <div className="relative isolate overflow-hidden rounded-lg border border-[rgba(144,18,20,0.12)] bg-[linear-gradient(135deg,rgba(144,18,20,0.94)_0%,rgba(127,83,62,0.96)_100%)] px-3 py-3 text-white">
      <span className="block select-none blur-md opacity-80">{value}</span>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,13,10,0.08)_0%,rgba(12,13,10,0.62)_100%)]" />
      <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 rounded-lg border border-[rgba(245,213,200,0.28)] bg-[rgba(12,13,10,0.72)] px-3 py-2 text-center backdrop-blur-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[rgba(245,213,200,0.98)]">
          Locked Insight
        </p>
      </div>
    </div>
  );
}

function CompatibilityDetailsDialog({
  onClose,
  parameters,
  result,
}: {
  onClose: () => void;
  parameters: PlanParameters;
  result: StoredCompatibilityResult;
}) {
  const hasLockedInsights = result.parameters.some((parameter) =>
    shouldBlurParameter(parameter, parameters),
  );
  const leftCircleLabel = "You";
  const rightCircleLabel = result.personName;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-[#2d1718]/50 px-4 py-6"
      role="dialog"
    >
      <div className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#EABFB9] bg-[#fafafa] p-6 shadow-[0_24px_80px_rgba(45,23,24,0.28)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-center text-xl font-bold tracking-tight text-[#2d1718]">
              Your Compatibility Snapshot
            </p>
          </div>
          <button
            aria-label="Close compatibility details"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#C07771] bg-[#fafafa] text-xl font-bold text-[#901214] transition hover:border-[#901214]"
            type="button"
            onClick={onClose}
          >
            x
          </button>
        </div>

        <div className="mt-5 flex items-center justify-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#C07771] bg-[#EABFB9] px-2 text-center text-xs font-bold leading-tight text-[#901214]">
            {leftCircleLabel}
          </div>
          <div className="flex min-w-40 flex-col items-center">
            <div className="flex w-full items-center gap-3">
              <span className="h-px flex-1 border-t border-dashed border-[#C07771]" />
              <span className="text-xl text-[#901214]">♥</span>
              <span className="h-px flex-1 border-t border-dashed border-[#C07771]" />
            </div>
            <p className="mt-2 text-sm font-bold text-[#2d1718]">
              You & {result.personName}
            </p>
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#C07771] bg-[#EABFB9] px-2 text-center text-[10px] font-bold leading-tight text-[#901214]">
            {rightCircleLabel}
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-[#EABFB9] bg-[#fffafa] p-4">
          <CompatibilityScoreLine label="Compatibility Score" score={result.score} />
        </div>

        {result.summary ? (
          <div className="mt-6 rounded-lg border border-[#EABFB9] bg-[#fdf1f0] p-4">
            <p className="text-sm font-bold text-[#901214]">Key Insight</p>
            <p className="mt-1 text-sm leading-6 text-[#2d1718]">{result.summary}</p>
          </div>
        ) : null}

        <div className="mt-6 grid gap-3.5 md:grid-cols-2">
          {result.parameters.length > 0 ? (
            result.parameters.map((parameter) => {
              const locked = shouldBlurParameter(parameter, parameters);
              const numericValue = Number(parameter.value);
              const numericScoreOnTen = getScoreOnTen(numericValue);
              const numericCategory = getCompatibilityCategory(numericValue);
              const showScoreLine =
                !locked && isNumericCompatibilityValue(parameter.value);

              return (
                <div
                  className="rounded-lg border border-[#EABFB9] bg-[#fffafa] p-4"
                  key={`${result.id}-${parameter.key}`}
                >
                  {showScoreLine ? (
                    <div className="grid grid-cols-[1fr_1.25fr_auto] items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#EABFB9] text-xs text-[#901214]">
                          ♥
                        </span>
                        <span className="text-xs font-semibold text-[#2d1718]">
                          {parameter.label}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#EABFB9]">
                        <div
                          className="h-full rounded-full bg-[#A22E34]"
                          style={{
                            width: `${Math.max(4, (numericScoreOnTen / 10) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="min-w-24 text-right text-xs font-bold text-[#2d1718]">
                        {numericCategory}
                      </span>
                    </div>
                  ) : (
                    <>
                      <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7F533E]">
                        {parameter.label}
                      </dt>
                      <dd className="mt-3 min-h-12 text-sm font-semibold leading-6 text-[#2d1718]">
                        {locked ? (
                          <LockedParameterValue value={parameter.value} />
                        ) : (
                          parameter.value
                        )}
                      </dd>
                    </>
                  )}
                </div>
              );
            })
          ) : (
            <div className="rounded-lg border border-dashed border-[#C07771] bg-[#fffafa] p-5 text-sm text-[#2d1718]/65 md:col-span-2">
              No compatibility parameters were returned for this user.
            </div>
          )}
        </div>

        {hasLockedInsights ? (
          <div className="mt-5 rounded-lg border border-[#EABFB9] bg-[#fffafa] px-4 py-4 text-sm leading-6 text-[#2d1718]/72">
            <p>Free plan locks Premium insights. Purchase Credits to unlock.</p>
            <Link
              className="mt-3 inline-flex min-h-10 items-center justify-center rounded-md bg-[#901214] px-4 text-sm font-bold text-white transition hover:bg-[#961116]"
              href="/dashboard#credits-access"
            >
              Purchase Credits
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DisconnectConfirmDialog({
  isSubmitting,
  onCancel,
  onConfirm,
  personName,
}: {
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  personName: string;
}) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-[#2d1718]/50 px-4 py-6"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-xl border border-[#EABFB9] bg-[#fafafa] p-6 shadow-[0_24px_80px_rgba(45,23,24,0.28)]">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#A22E34]">
          Confirm Disconnect
        </p>
        <h3 className="mt-3 font-display text-3xl font-bold text-[#2d1718]">
          {personName}
        </h3>
        <p className="mt-4 text-sm font-semibold leading-6 text-[#2d1718]/72">
          Disconnecting removes this accepted connection and closes direct chat access.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-[#C07771] bg-[#fafafa] px-5 text-sm font-bold text-[#901214] transition hover:border-[#901214] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#901214] px-5 text-sm font-bold text-white transition hover:bg-[#961116] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="button"
            onClick={onConfirm}
          >
            {isSubmitting ? "Disconnecting..." : "Disconnect"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CompatibilityConfirmDialog({
  isSubmitting,
  onCancel,
  onConfirm,
  personName,
}: {
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  personName: string;
}) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-[#2d1718]/50 px-4 py-6"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-xl border border-[#EABFB9] bg-[#fafafa] p-6 shadow-[0_24px_80px_rgba(45,23,24,0.28)]">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#A22E34]">
          Confirm Compatibility
        </p>
        <h3 className="mt-3 font-display text-3xl font-bold text-[#2d1718]">
          {personName}
        </h3>
        <p className="mt-4 text-sm font-semibold leading-6 text-[#2d1718]/72">
          Checking Compatibility reqired 1 credit. Say yes to continue
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-[#C07771] bg-[#fafafa] px-5 text-sm font-bold text-[#901214] transition hover:border-[#901214] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#901214] px-5 text-sm font-bold text-white transition hover:bg-[#961116] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="button"
            onClick={onConfirm}
          >
            {isSubmitting ? "Checking..." : "Yes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AcceptedConnectionCard({
  compatibilityResult,
  connection,
  currentProfileId,
  isChecking,
  isDisconnecting,
  onChat,
  onCheckCompatibility,
  onDisconnect,
  onDetails,
  unreadCount,
}: {
  compatibilityResult?: StoredCompatibilityResult;
  connection: Connection;
  currentProfileId?: number;
  isChecking: boolean;
  isDisconnecting: boolean;
  onChat: () => void;
  onCheckCompatibility: () => void;
  onDisconnect: () => void;
  onDetails: () => void;
  unreadCount: number;
}) {
  const peer = getConnectionPeer(connection, currentProfileId);
  const visibleUnreadCount = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <article className="group flex min-h-64 flex-col justify-between rounded-lg border border-[#EABFB9] bg-[#fafafa] p-5 shadow-[0_10px_24px_rgba(144,18,20,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(144,18,20,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <ProfileAvatar profile={peer} />
          <h3 className="truncate font-display text-3xl font-bold tracking-tight text-[#2d1718]">
            {getProfileDisplayName(peer)}
          </h3>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            aria-label={`Chat with ${getProfileDisplayName(peer)}`}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#C07771] bg-[#fafafa] text-[#901214] transition hover:border-[#901214] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDisconnecting}
            type="button"
            onClick={onChat}
          >
            <ChatIcon />
            {unreadCount > 0 ? (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full border border-[#fafafa] bg-[#901214] px-1.5 text-[10px] font-bold leading-none text-[#fafafa] shadow-[0_8px_18px_rgba(12,13,10,0.18)]">
                {visibleUnreadCount}
              </span>
            ) : null}
          </button>
          <button
            aria-label={`Disconnect from ${getProfileDisplayName(peer)}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#901214] text-white transition hover:bg-[#961116] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDisconnecting}
            type="button"
            onClick={onDisconnect}
          >
            <DisconnectIcon />
          </button>
        </div>
      </div>

      <dl className="mt-6 grid gap-3">
        <div className="rounded-lg border border-[#EABFB9] bg-[#fffafa] p-4">
          <dt className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7F533E]">
            Place
          </dt>
          <dd className="mt-2 text-sm font-bold text-[#901214]">
            {peer.place_of_birth || "Not available"}
          </dd>
        </div>
      </dl>

      <div className="mt-5 grid gap-3">
        <div className="rounded-lg border border-[#EABFB9] bg-[#fffafa] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7F533E]">
                Compatibility
              </p>
              {compatibilityResult ? (
                <p className="mt-1 font-display text-3xl font-bold leading-none text-[#901214]">
                  {getCompatibilityCategory(compatibilityResult.score)}
                </p>
              ) : (
                <p className="mt-2 text-sm font-bold leading-5 text-[#901214]">
                  Run compatibility to view score
                </p>
              )}
            </div>
            {compatibilityResult ? (
              <button
                aria-label={`View compatibility details for ${getProfileDisplayName(peer)}`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#C07771] bg-[#fafafa] text-[#901214] transition hover:border-[#901214]"
                type="button"
                onClick={onDetails}
              >
                <DetailsIcon />
              </button>
            ) : null}
          </div>

          {compatibilityResult ? (
            <CompatibilityScoreLine
              className="mt-3"
              label="Compatibility Score"
              score={compatibilityResult.score}
            />
          ) : (
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[rgba(144,18,20,0.1)]">
              <div className="h-full w-0 rounded-full bg-[#901214]" />
            </div>
          )}
        </div>

        <button
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#901214] px-4 text-xs font-bold text-white transition hover:bg-[#961116] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isChecking}
          type="button"
          onClick={onCheckCompatibility}
        >
          {isChecking ? "Checking..." : "Check Compatibility"}
        </button>
      </div>
    </article>
  );
}

function ConnectionRow({
  actions,
  compatibilityResult,
  connection,
  currentProfileId,
  detail,
}: {
  actions?: React.ReactNode;
  compatibilityResult?: StoredCompatibilityResult;
  connection: Connection;
  currentProfileId?: number;
  detail: string;
}) {
  const peer = getConnectionPeer(connection, currentProfileId);

  return (
    <article className="rounded-xl border border-[#EABFB9] bg-[#fffafa] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <ProfileAvatar profile={peer} />
          <div className="min-w-0">
            <h3 className="truncate font-display text-2xl font-bold tracking-tight text-[#2d1718]">
              {getProfileDisplayName(peer)}
            </h3>
            {peer.place_of_birth ? (
              <p className="mt-1 text-sm leading-6 text-[#2d1718]/70">
                {peer.place_of_birth}
              </p>
            ) : null}
            <p className="mt-1 text-sm leading-6 text-[#2d1718]/70">{detail}</p>
            {compatibilityResult ? (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#EABFB9] bg-[#fafafa] px-3 py-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7F533E]">
                  Overall compatibility
                </span>
                <span className="font-display text-xl font-bold leading-none text-[#901214]">
                  {getCompatibilityCategory(compatibilityResult.score)}
                </span>
              </div>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
    </article>
  );
}

function SuggestionCard({
  action,
  disabled,
  match,
}: {
  action: React.ReactNode;
  disabled?: boolean;
  match: UserMatch;
}) {
  const matchedUser = match.matched_user;

  return (
    <article className="flex h-full flex-col rounded-xl border border-[#EABFB9] bg-[#fafafa] p-5 shadow-[0_10px_24px_rgba(144,18,20,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(144,18,20,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <ProfileAvatar profile={matchedUser} />
          <div className="min-w-0">
            <h3 className="truncate font-display text-2xl font-bold tracking-tight text-[#2d1718]">
              {getProfileDisplayName(matchedUser)}
            </h3>
          </div>
        </div>
      </div>

      <div className="mt-5 flex-1 space-y-2 text-sm leading-6 text-[#2d1718]/70">
        {matchedUser.gender ? <p>{matchedUser.gender}</p> : null}
        {matchedUser.date_of_birth ? <p>{matchedUser.date_of_birth}</p> : null}
        {matchedUser.place_of_birth ? <p>{matchedUser.place_of_birth}</p> : null}
        {!matchedUser.gender && !matchedUser.date_of_birth && !matchedUser.place_of_birth ? (
          <p>Public profile details are limited for this match.</p>
        ) : null}
      </div>

      <div className={cn("mt-5", disabled && "opacity-70")}>{action}</div>
    </article>
  );
}

export function ConnectionsManager() {
  const setResults = useResultsStore((state) => state.setResults);
  const { parameters } = usePlanAccess();
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<Connection[]>([]);
  const [sentRequests, setSentRequests] = useState<Connection[]>([]);
  const [userMatches, setUserMatches] = useState<UserMatch[]>([]);
  const [compatibilityScoresByProfile, setCompatibilityScoresByProfile] = useState<
    Record<string, StoredCompatibilityResult>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [connectionsPage, setConnectionsPage] = useState(1);
  const [receivedRequestsPage, setReceivedRequestsPage] = useState(1);
  const [sentRequestsPage, setSentRequestsPage] = useState(1);
  const [suggestionsPage, setSuggestionsPage] = useState(1);
  const [disconnectTarget, setDisconnectTarget] = useState<Connection | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Connection | null>(null);
  const [chatConnection, setChatConnection] = useState<Connection | null>(null);
  const [detailResult, setDetailResult] = useState<StoredCompatibilityResult | null>(
    null,
  );
  const { getUnreadForConnection, markConversationRead } =
    useChatConversationUnreadCounts();

  const refreshConnections = async () => {
    const [acceptedResponse, receivedResponse, sentResponse] = await Promise.all([
      connectionService.accepted(),
      connectionService.received(),
      connectionService.sent(),
    ]);

    setConnections(withDefaultStatus(acceptedResponse.results ?? [], "accepted"));
    setReceivedRequests(withDefaultStatus(receivedResponse.results ?? [], "pending"));
    setSentRequests(withDefaultStatus(sentResponse.results ?? [], "pending"));
  };

  useEffect(() => {
    void (async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        const [profileResponse, userMatchesResponse, historyResponse] = await Promise.all([
          profileService.getMe(),
          userMatchService.list(),
          compatibilityService.history().catch(() => ({ results: [] })),
          refreshConnections(),
        ]);

        setCurrentProfile(profileResponse.results?.[0] ?? null);
        setUserMatches(userMatchesResponse.results ?? []);
        setCompatibilityScoresByProfile(buildCompatibilityScoresByProfile(historyResponse));
      } catch {
        setLoadError("Unable to load connections right now.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const pendingReceivedRequests = useMemo(
    () => receivedRequests.filter((connection) => connection.status !== "accepted"),
    [receivedRequests],
  );

  const pendingSentRequests = useMemo(
    () => sentRequests.filter((connection) => connection.status !== "accepted"),
    [sentRequests],
  );

  const allKnownConnections = useMemo(
    () => [...connections, ...receivedRequests, ...sentRequests],
    [connections, receivedRequests, sentRequests],
  );

  const suggestions = useMemo(
    () =>
      [...userMatches]
        .filter((match) => {
          const existingConnection = getConnectionForProfile(
            allKnownConnections,
            match.matched_user.id,
          );

          return existingConnection?.status !== "accepted";
        })
        .sort((first, second) => {
          if (first.rank !== second.rank) {
            return first.rank - second.rank;
          }

          return second.score - first.score;
        }),
    [allKnownConnections, userMatches],
  );

  const connectionsPageCount = getPageCount(connections.length);
  const receivedRequestsPageCount = getPageCount(pendingReceivedRequests.length);
  const sentRequestsPageCount = getPageCount(pendingSentRequests.length);
  const suggestionsPageCount = getPageCount(suggestions.length);

  const paginatedConnections = useMemo(
    () => paginate(connections, connectionsPage),
    [connections, connectionsPage],
  );
  const paginatedReceivedRequests = useMemo(
    () => paginate(pendingReceivedRequests, receivedRequestsPage),
    [pendingReceivedRequests, receivedRequestsPage],
  );
  const paginatedSentRequests = useMemo(
    () => paginate(pendingSentRequests, sentRequestsPage),
    [pendingSentRequests, sentRequestsPage],
  );
  const paginatedSuggestions = useMemo(
    () => paginate(suggestions, suggestionsPage),
    [suggestions, suggestionsPage],
  );

  useEffect(() => {
    setConnectionsPage((current) => Math.min(current, connectionsPageCount));
  }, [connectionsPageCount]);

  useEffect(() => {
    setReceivedRequestsPage((current) => Math.min(current, receivedRequestsPageCount));
  }, [receivedRequestsPageCount]);

  useEffect(() => {
    setSentRequestsPage((current) => Math.min(current, sentRequestsPageCount));
  }, [sentRequestsPageCount]);

  useEffect(() => {
    setSuggestionsPage((current) => Math.min(current, suggestionsPageCount));
  }, [suggestionsPageCount]);

  const handleConnectionRequest = async (matchedUser: UserProfile) => {
    try {
      setPendingAction(`request-${matchedUser.id}`);
      setActionError(null);
      setActionMessage(null);

      await connectionService.request(matchedUser.id);
      await refreshConnections();
      setActionMessage("Connection request sent.");
    } catch (error) {
      setActionError(
        extractActionErrorMessage(error, "Unable to send connection request right now."),
      );
    } finally {
      setPendingAction(null);
    }
  };

  const handleConnectionAction = async (connection: Connection, action: ConnectionAction) => {
    try {
      setPendingAction(`${action}-${connection.id}`);
      setActionError(null);
      setActionMessage(null);

      await connectionService[action](connection.id);
      await refreshConnections();
      setActionMessage(
        action === "accept"
          ? "Connection request accepted."
          : action === "decline"
            ? "Connection request declined."
            : action === "cancel"
              ? "Connection request cancelled."
              : "Connection disconnected.",
      );
    } catch (error) {
      setActionError(
        extractActionErrorMessage(error, "Unable to update connection right now."),
      );
    } finally {
      setPendingAction(null);
    }
  };

  const handleCompatibilityCheck = async (connection: Connection) => {
    const peer = getConnectionPeer(connection, currentProfile?.id);

    if (!peer.id) {
      setActionError("Unable to identify this connection for compatibility.");
      return;
    }

    try {
      setPendingAction(`compatibility-${connection.id}`);
      setActionError(null);
      setActionMessage(null);

      const response = await compatibilityService.calculate({
        matched_user_id: peer.id,
      });
      const normalizedResults = normalizeCompatibilityResults(response, {
        [String(peer.id)]: getProfileDisplayName(peer),
      });

      setResults(normalizedResults);
      setCompatibilityScoresByProfile((currentScores) => {
        const nextScores = { ...currentScores };

        normalizedResults.forEach((result) => {
          const profileId = getCompatibilityProfileId(result) ?? String(peer.id);
          nextScores[profileId] = result;
        });

        return nextScores;
      });
      setActionMessage("Compatibility check completed.");
    } catch (error) {
      setActionError(
        extractActionErrorMessage(error, "Compatibility check failed. Please try again."),
      );
    } finally {
      setConfirmTarget(null);
      setPendingAction(null);
    }
  };

  const openCompatibilityDetails = (
    result: StoredCompatibilityResult,
    peer: UserProfile | Connection,
  ) => {
    setDetailResult({
      ...result,
      personName: getProfileDisplayName(peer),
    });
  };

  const disconnectTargetPeer = disconnectTarget
    ? getConnectionPeer(disconnectTarget, currentProfile?.id)
    : null;
  const confirmTargetPeer = confirmTarget
    ? getConnectionPeer(confirmTarget, currentProfile?.id)
    : null;

  return (
    <main className="min-h-screen bg-[#fffafa] text-[#2d1718]">
      <section className="bg-[linear-gradient(180deg,#fffafa_0%,#fdf1f0_100%)] px-6 py-10">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="inline-flex rounded-full bg-[#EABFB9] px-4 py-2 text-sm font-bold text-[#901214]">
              relationship network
            </p>
            <h1 className="mt-5 max-w-3xl font-display text-6xl font-bold leading-[1.05] tracking-tight text-[#2d1718]">
              Build connections
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#2d1718]/72">
              Find compatible people from our network. 
            </p>
          </div>
          <div className="rounded-2xl border border-[#EABFB9] bg-[#fafafa] p-6 shadow-[0_18px_42px_rgba(144,18,20,0.1)]">
            <p className="text-sm font-bold text-[#901214]">Connection Snapshot</p>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-[#EABFB9] bg-[#fffafa] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7F533E]">
                  Accepted
                </p>
                <p className="mt-2 font-display text-4xl font-bold text-[#901214]">
                  {connections.length}
                </p>
              </div>
              <div className="rounded-xl border border-[#EABFB9] bg-[#fffafa] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7F533E]">
                  Received
                </p>
                <p className="mt-2 font-display text-4xl font-bold text-[#901214]">
                  {pendingReceivedRequests.length}
                </p>
              </div>
              <div className="rounded-xl border border-[#EABFB9] bg-[#fffafa] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7F533E]">
                  Suggestions
                </p>
                <p className="mt-2 font-display text-4xl font-bold text-[#901214]">
                  {suggestions.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8">
        {loadError ? <ConnectionsAlert>{loadError}</ConnectionsAlert> : null}
        {actionError ? <ConnectionsAlert>{actionError}</ConnectionsAlert> : null}
        {actionMessage ? (
          <div className="rounded-lg border border-[#EABFB9] bg-[#fdf1f0] px-4 py-3 text-sm font-semibold text-[#901214]">
            {actionMessage}
          </div>
        ) : null}

      <div className="grid gap-8">
        <ConnectionsSection
          eyebrow="Connections"
          title=""
          description="People you are currently connected with, including chat access and compatibility status."
        >
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {isLoading ? (
              <ConnectionsEmpty className="md:col-span-2 xl:col-span-3">
                Loading accepted connections...
              </ConnectionsEmpty>
            ) : null}
            {!isLoading && connections.length === 0 ? (
              <ConnectionsEmpty className="md:col-span-2 xl:col-span-3">
                No accepted connections yet.
              </ConnectionsEmpty>
            ) : null}
            {!isLoading
              ? paginatedConnections.map((connection) => {
                  const unreadCount = getUnreadForConnection(connection.id);
                  const peer = getConnectionPeer(connection, currentProfile?.id);
                  const compatibilityResult =
                    compatibilityScoresByProfile[String(peer.id)];

                  return (
                    <AcceptedConnectionCard
                      key={connection.id}
                      connection={connection}
                      compatibilityResult={compatibilityResult}
                      currentProfileId={currentProfile?.id}
                      isChecking={pendingAction === `compatibility-${connection.id}`}
                      isDisconnecting={pendingAction === `disconnect-${connection.id}`}
                      unreadCount={unreadCount}
                      onChat={() => setChatConnection(connection)}
                      onCheckCompatibility={() => setConfirmTarget(connection)}
                      onDisconnect={() => setDisconnectTarget(connection)}
                      onDetails={() => openCompatibilityDetails(compatibilityResult, peer)}
                    />
                  );
                })
              : null}
          </div>
          <PaginationControls
            label="Connections"
            page={connectionsPage}
            totalPages={connectionsPageCount}
            onPageChange={setConnectionsPage}
          />
        </ConnectionsSection>

        <ConnectionsSection
          eyebrow="Suggested Match for you"
          title=""
          description={
            <>
              Suggestions are based on your Match Connection preferences.{" "}
              <Link
                className="font-bold text-[#901214] underline-offset-4 transition hover:underline"
                href="/profile#match-preference"
              >
                View your Match Preference →
              </Link>
            </>
          }
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {isLoading ? (
              <ConnectionsEmpty className="md:col-span-2 xl:col-span-3">
                Loading suggestions...
              </ConnectionsEmpty>
            ) : null}
            {!isLoading && suggestions.length === 0 ? (
              <ConnectionsEmpty className="md:col-span-2 xl:col-span-3">
                No suggestions are available yet.
              </ConnectionsEmpty>
            ) : null}
            {!isLoading
              ? paginatedSuggestions.map((match) => {
                  const matchedUser = match.matched_user;
                  const existingConnection = getConnectionForProfile(
                    allKnownConnections,
                    matchedUser.id,
                  );
                  const isPending = existingConnection?.status === "pending";
                  const isReceivedPending =
                    existingConnection?.receiver?.id === currentProfile?.id && isPending;

                  return (
                    <SuggestionCard
                      key={match.id}
                      match={match}
                      disabled={Boolean(existingConnection)}
                      action={
                        isReceivedPending && existingConnection ? (
                          <div className="flex flex-wrap gap-2">
                            <ConnectionsButton
                              className="px-4 py-2 text-xs"
                              disabled={pendingAction === `accept-${existingConnection.id}`}
                              onClick={() => handleConnectionAction(existingConnection, "accept")}
                            >
                              {pendingAction === `accept-${existingConnection.id}`
                                ? "Accepting..."
                                : "Accept"}
                            </ConnectionsButton>
                            <ConnectionsButton
                              className="px-4 py-2 text-xs"
                              disabled={pendingAction === `decline-${existingConnection.id}`}
                              variant="ghost"
                              onClick={() => handleConnectionAction(existingConnection, "decline")}
                            >
                              {pendingAction === `decline-${existingConnection.id}`
                                ? "Declining..."
                                : "Decline"}
                            </ConnectionsButton>
                          </div>
                        ) : isPending && existingConnection ? (
                          <ConnectionsButton
                            className="px-4 py-2 text-xs"
                            disabled={pendingAction === `cancel-${existingConnection.id}`}
                            variant="ghost"
                            onClick={() => handleConnectionAction(existingConnection, "cancel")}
                          >
                            {pendingAction === `cancel-${existingConnection.id}`
                              ? "Cancelling..."
                              : "Request Sent"}
                          </ConnectionsButton>
                        ) : (
                          <ConnectionsButton
                            className="px-4 py-2 text-xs"
                            disabled={pendingAction === `request-${matchedUser.id}`}
                            onClick={() => handleConnectionRequest(matchedUser)}
                          >
                            {pendingAction === `request-${matchedUser.id}`
                              ? "Connecting..."
                              : "Connect"}
                          </ConnectionsButton>
                        )
                      }
                    />
                  );
                })
              : null}
          </div>
          <PaginationControls
            label="Suggestions"
            page={suggestionsPage}
            totalPages={suggestionsPageCount}
            onPageChange={setSuggestionsPage}
          />
        </ConnectionsSection>

        <ConnectionsSection
          eyebrow="Connection Requests"
          title=""
          description="Review incoming requests and manage invitations you have already sent."
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="font-display text-1xl font-bold tracking-tight text-[#2d1718]">
                Received
              </h3>
              <div className="mt-4 grid gap-4">
                {isLoading ? <ConnectionsEmpty>Loading received requests...</ConnectionsEmpty> : null}
                {!isLoading && pendingReceivedRequests.length === 0 ? (
                  <ConnectionsEmpty>No pending received requests.</ConnectionsEmpty>
                ) : null}
                {!isLoading
                  ? paginatedReceivedRequests.map((connection) => (
                      <ConnectionRow
                        key={connection.id}
                        connection={connection}
                        currentProfileId={currentProfile?.id}
                        detail={`Requested ${formatTimestamp(connection.requested_at)}`}
                        actions={
                          <>
                            <ConnectionsButton
                              className="px-4 py-2 text-xs"
                              disabled={pendingAction === `accept-${connection.id}`}
                              onClick={() => handleConnectionAction(connection, "accept")}
                            >
                              {pendingAction === `accept-${connection.id}`
                                ? "Accepting..."
                                : "Accept"}
                            </ConnectionsButton>
                            <ConnectionsButton
                              className="px-4 py-2 text-xs"
                              disabled={pendingAction === `decline-${connection.id}`}
                              variant="ghost"
                              onClick={() => handleConnectionAction(connection, "decline")}
                            >
                              {pendingAction === `decline-${connection.id}`
                                ? "Declining..."
                                : "Decline"}
                            </ConnectionsButton>
                          </>
                        }
                      />
                    ))
                  : null}
              </div>
              <PaginationControls
                label="Received"
                page={receivedRequestsPage}
                totalPages={receivedRequestsPageCount}
                onPageChange={setReceivedRequestsPage}
              />
            </div>

            <div>
              <h3 className="font-display text-1xl font-bold tracking-tight text-[#2d1718]">
                Sent
              </h3>
              <div className="mt-4 grid gap-4">
                {isLoading ? <ConnectionsEmpty>Loading sent requests...</ConnectionsEmpty> : null}
                {!isLoading && pendingSentRequests.length === 0 ? (
                  <ConnectionsEmpty>No pending sent requests.</ConnectionsEmpty>
                ) : null}
                {!isLoading
                  ? paginatedSentRequests.map((connection) => (
                      <ConnectionRow
                        key={connection.id}
                        connection={connection}
                        currentProfileId={currentProfile?.id}
                        detail={`Sent ${formatTimestamp(connection.requested_at)}`}
                        actions={
                          <ConnectionsButton
                            className="px-4 py-2 text-xs"
                            disabled={pendingAction === `cancel-${connection.id}`}
                            variant="ghost"
                            onClick={() => handleConnectionAction(connection, "cancel")}
                          >
                            {pendingAction === `cancel-${connection.id}`
                              ? "Cancelling..."
                              : "Cancel"}
                          </ConnectionsButton>
                        }
                      />
                    ))
                  : null}
              </div>
              <PaginationControls
                label="Sent"
                page={sentRequestsPage}
                totalPages={sentRequestsPageCount}
                onPageChange={setSentRequestsPage}
              />
            </div>
          </div>
        </ConnectionsSection>

      </div>
        <SiteFooter />
        <ChatDialog
          currentProfileId={currentProfile?.id}
          currentUserId={currentProfile?.user?.id}
          initialConnection={chatConnection}
          open={Boolean(chatConnection)}
          onConversationRead={markConversationRead}
          onClose={() => setChatConnection(null)}
        />
        {disconnectTarget ? (
          <DisconnectConfirmDialog
            isSubmitting={pendingAction === `disconnect-${disconnectTarget.id}`}
            onCancel={() => setDisconnectTarget(null)}
            onConfirm={() => {
              void handleConnectionAction(disconnectTarget, "disconnect").then(() => {
                setDisconnectTarget(null);
              });
            }}
            personName={getProfileDisplayName(disconnectTargetPeer)}
          />
        ) : null}
        {confirmTarget && confirmTargetPeer ? (
          <CompatibilityConfirmDialog
            isSubmitting={pendingAction === `compatibility-${confirmTarget.id}`}
            onCancel={() => setConfirmTarget(null)}
            onConfirm={() => {
              void handleCompatibilityCheck(confirmTarget);
            }}
            personName={getProfileDisplayName(confirmTargetPeer)}
          />
        ) : null}
        {detailResult ? (
          <CompatibilityDetailsDialog
            onClose={() => setDetailResult(null)}
            parameters={parameters}
            result={detailResult}
          />
        ) : null}
      </div>
    </main>
  );
}
