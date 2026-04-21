"use client";

import { isAxiosError } from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";
import { CompatibilityScoreLine } from "@/components/ui/compatibility-score";
import { useChatTotalUnreadCount } from "@/hooks/useChatNotifications";
import { compatibilityService } from "@/services/compatibilityService";
import { connectionService } from "@/services/connectionService";
import { normalizeCompatibilityResults } from "@/services/compatibilityMapper";
import { normalizePlanParameters } from "@/services/planMapper";
import { planService } from "@/services/planService";
import { privatePersonsService } from "@/services/privatePersonsService";
import { profileService } from "@/services/profileService";
import { userMatchService } from "@/services/userMatchService";
import { useAuthStore } from "@/store/authStore";
import { usePlanStore } from "@/store/planStore";
import { useResultsStore, type StoredCompatibilityResult } from "@/store/resultsStore";
import type { ApiErrorResponse } from "@/types/common";
import type { Connection } from "@/types/connection";
import type { PrivatePerson } from "@/types/private-persons";
import type { PlanParameters } from "@/types/plan";
import type { UserProfile } from "@/types/profile";
import type { UserMatch } from "@/types/user-match";

const heroRotatingWords = ["sex", "love", "friendship", "time"];

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

const extractActionErrorMessage = (error: unknown, fallback: string) => {
  if (isAxiosError<ServerMessagePayload>(error)) {
    return getServerMessage(error.response?.data) || fallback;
  }

  return fallback;
};

const formatTimestamp = (value?: string) => {
  if (!value) {
    return "Just now";
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

const getProfileDisplayName = (profile: UserProfile) => {
  const firstName = profile.first_name ?? profile.user?.first_name ?? "";
  const lastName = profile.last_name ?? profile.user?.last_name ?? "";
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || profile.user?.username || `Profile #${profile.id}`;
};

const getProfileInitials = (profile: UserProfile) => {
  const name = getProfileDisplayName(profile);
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return initials || "UM";
};

const getConnectionPeer = (connection: Connection, currentProfileId?: number) => {
  if (!connection.requester || !connection.receiver) {
    return connection;
  }

  if (!currentProfileId) {
    return connection.requester;
  }

  return connection.requester.id === currentProfileId
    ? connection.receiver
    : connection.requester;
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
        String(connection.receiver?.id) === targetProfileId,
    ) ?? null
  );
};

const withDefaultConnectionStatus = (
  connections: Connection[],
  status: Connection["status"],
) => connections.map((connection) => ({ ...connection, status: connection.status ?? status }));

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

function LockedInsightCard({
  label,
  value,
  cta,
}: {
  label: string;
  value: string;
  cta: string;
}) {
  return (
    <div className="relative isolate overflow-hidden rounded-2xl border border-[#eabfb9]/20 bg-[linear-gradient(180deg,rgba(144,18,20,0.88)_0%,rgba(127,83,62,0.96)_100%)] p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(245,213,200,0.18),transparent_45%)]" />
      <p className="relative text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f5d5c8]">
        Locked Insight
      </p>
      <p className="relative mt-3 text-sm font-medium text-white">{label}</p>
      <p className="relative mt-3 select-none text-sm leading-7 text-[#f5d5c8] blur-sm">
        {value}
      </p>
      <div className="absolute inset-x-5 top-1/2 -translate-y-1/2 rounded-xl border border-[#f5d5c8]/20 bg-[#0c0d0a]/80 px-3 py-3 text-center backdrop-blur-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#f5d5c8]">
          Unlock Required
        </p>
        <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[#fafafa]">
          {cta}
        </p>
      </div>
    </div>
  );
}

const createPaymentReference = (credits: number) => {
  const suffix =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : String(Date.now());

  return `homepage-${credits}-${suffix}`;
};

function HomeShell({
  children,
  actions,
}: {
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(162,46,52,0.22),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(178,128,107,0.16),transparent_20%),linear-gradient(180deg,#0c0d0a_0%,#901214_45%,#7f533e_100%)] px-6 py-8 text-white sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-[1.75rem] border border-white/10 bg-white/5 px-5 py-4 shadow-[0_24px_80px_rgba(12,13,10,0.45)] backdrop-blur-xl">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#f5d5c8]">
              Matchmaking Intelligence
            </p>
            <p className="mt-2 text-sm text-[#eabfb9]">
              Faster checks, deeper signals, cleaner credit conversion.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">{actions}</div>
        </header>
        {children}
      </div>
    </main>
  );
}

function Surface({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(144,18,20,0.9)_0%,rgba(127,83,62,0.82)_100%)] p-6 shadow-[0_24px_80px_rgba(12,13,10,0.36)] backdrop-blur-xl ${className}`}
    >
      {children}
    </section>
  );
}

function MiniActionLink({
  badge,
  href,
  children,
  tone = "default",
}: {
  badge?: number;
  href: string;
  children: ReactNode;
  tone?: "default" | "gold";
}) {
  const visibleBadge = badge && badge > 0 ? (badge > 99 ? "99+" : String(badge)) : null;

  return (
    <Link
      href={href}
      className={`relative inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition ${
        tone === "gold"
          ? "border border-[#f5d5c8]/45 bg-[#f5d5c8] text-[#0c0d0a] hover:bg-[#eabfb9]"
          : "border border-white/12 bg-white/6 text-white hover:border-[#f5d5c8]/45 hover:bg-white/10"
      }`}
    >
      {children}
      {visibleBadge ? (
        <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full border border-[#fafafa] bg-[#901214] px-1.5 text-[10px] font-bold leading-none text-[#fafafa] shadow-[0_8px_18px_rgba(12,13,10,0.24)]">
          {visibleBadge}
        </span>
      ) : null}
    </Link>
  );
}

function RotatingHeroWord() {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setWordIndex((currentIndex) => (currentIndex + 1) % heroRotatingWords.length);
    }, 1500);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <span
      key={heroRotatingWords[wordIndex]}
      className="hero-rotating-word inline-block min-w-[6.9em] text-[#f5d5c8]"
      aria-live="polite"
    >
      {heroRotatingWords[wordIndex]}
    </span>
  );
}

export function HomeManager() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const totalUnreadCount = useChatTotalUnreadCount();
  const parameters = usePlanStore((state) => state.parameters);
  const setCredits = usePlanStore((state) => state.setCredits);
  const setParameters = usePlanStore((state) => state.setParameters);
  const setResults = useResultsStore((state) => state.setResults);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [privatePersons, setPrivatePersons] = useState<PrivatePerson[]>([]);
  const [topMatches, setTopMatches] = useState<StoredCompatibilityResult[]>([]);
  const [history, setHistory] = useState<StoredCompatibilityResult[]>([]);
  const [userMatches, setUserMatches] = useState<UserMatch[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [receivedConnectionRequests, setReceivedConnectionRequests] = useState<Connection[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [userMatchesLoadError, setUserMatchesLoadError] = useState<string | null>(null);
  const [connectionsLoadError, setConnectionsLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isRunningCheck, setIsRunningCheck] = useState(false);
  const [isPurchasingCredits, setIsPurchasingCredits] = useState<number | null>(null);
  const [pendingConnectionAction, setPendingConnectionAction] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    void (async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        setUserMatchesLoadError(null);
        setConnectionsLoadError(null);

        const [
          topMatchesResponse,
          historyResponse,
          privatePersonsResponse,
          profileResponse,
          currentPlanResponse,
          parameterResponse,
          userMatchesResponse,
          connectionsResponse,
          receivedConnectionsResponse,
        ] = await Promise.all([
          compatibilityService.topMatches(),
          compatibilityService.history(),
          privatePersonsService.list(),
          profileService.getMe(),
          planService.getCurrent(),
          planService.getParameters(),
          userMatchService.list().catch(() => {
            setUserMatchesLoadError("Unable to load user matches right now.");
            return null;
          }),
          connectionService.list().catch(() => {
            setConnectionsLoadError("Unable to load connections right now.");
            return null;
          }),
          connectionService.received().catch(() => {
            setConnectionsLoadError("Unable to load connection requests right now.");
            return null;
          }),
        ]);

        const nextPrivatePersons = privatePersonsResponse.results ?? [];
        const nextProfile = profileResponse.results?.[0] ?? null;

        setTopMatches(normalizeCompatibilityResults(topMatchesResponse));
        setHistory(normalizeCompatibilityResults(historyResponse));
        setPrivatePersons(nextPrivatePersons);
        setProfile(nextProfile);
        setCredits(currentPlanResponse.credits ?? 0);
        setParameters(normalizePlanParameters(parameterResponse.parameters));
        setUserMatches(userMatchesResponse?.results ?? []);
        setConnections(
          withDefaultConnectionStatus(connectionsResponse?.results ?? [], "accepted"),
        );
        setReceivedConnectionRequests(
          withDefaultConnectionStatus(
            receivedConnectionsResponse?.results ?? [],
            "pending",
          ),
        );

        if (nextPrivatePersons[0]?.id) {
          setSelectedPersonId(String(nextPrivatePersons[0].id));
        }
      } catch {
        setLoadError("Unable to load your compatibility workspace right now.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [setCredits, setParameters, token]);

  const selectedPerson = useMemo(
    () => privatePersons.find((person) => String(person.id) === selectedPersonId) ?? null,
    [privatePersons, selectedPersonId],
  );

  const previewResult = topMatches[0] ?? history[0] ?? null;
  const topUserMatches = useMemo(
    () =>
      [...userMatches]
        .sort((first, second) => {
          if (first.rank !== second.rank) {
            return first.rank - second.rank;
          }

          return second.score - first.score;
        })
        .slice(0, 3),
    [userMatches],
  );
  const pendingReceivedConnectionRequests = useMemo(
    () =>
      receivedConnectionRequests.filter((connection) => connection.status !== "accepted"),
    [receivedConnectionRequests],
  );
  const visiblePreviewParameters = useMemo(() => {
    if (!previewResult) {
      return [];
    }

    return previewResult.parameters
      .filter((parameter) => !shouldBlurParameter(parameter, parameters))
      .slice(0, 2);
  }, [parameters, previewResult]);
  const premiumPreviewParameters = useMemo(() => {
    if (!previewResult) {
      return [];
    }

    const locked = previewResult.parameters.filter((parameter) =>
      shouldBlurParameter(parameter, parameters),
    );

    if (locked.length > 0) {
      return locked.slice(0, 3);
    }

    return previewResult.parameters.slice(2, 5);
  }, [parameters, previewResult]);

  const greetingName = user?.username || user?.email || "Welcome back";

  const refreshConnections = async () => {
    const [connectionsResponse, receivedConnectionsResponse] = await Promise.all([
      connectionService.list(),
      connectionService.received(),
    ]);

    setConnections(withDefaultConnectionStatus(connectionsResponse.results ?? [], "accepted"));
    setReceivedConnectionRequests(
      withDefaultConnectionStatus(receivedConnectionsResponse.results ?? [], "pending"),
    );
  };

  const handleRunCompatibility = async () => {
    if (!profile?.id) {
      router.push("/profile");
      return;
    }

    if (!selectedPersonId) {
      router.push("/private-persons");
      return;
    }

    try {
      setIsRunningCheck(true);
      setActionError(null);
      setActionMessage(null);

      const response = await compatibilityService.calculate({
        matched_private_person_id: selectedPersonId,
      });

      const normalizedResults = normalizeCompatibilityResults(response, {
        [selectedPersonId]: selectedPerson?.name ?? "Selected match",
      });

      setResults(normalizedResults);
      router.push("/results");
    } catch (error) {
      setActionError(
        extractActionErrorMessage(error, "Compatibility check failed. Please try again."),
      );
    } finally {
      setIsRunningCheck(false);
    }
  };

  const handlePurchaseCredits = async (creditAmount: number) => {
    try {
      setIsPurchasingCredits(creditAmount);
      setActionError(null);
      setActionMessage(null);

      const purchaseResponse = await planService.purchase({
        credits: creditAmount,
        payment_reference: createPaymentReference(creditAmount),
      });

      if (typeof purchaseResponse.credits === "number") {
        setCredits(purchaseResponse.credits);
      } else {
        const refreshedPlan = await planService.getCurrent();
        setCredits(refreshedPlan.credits ?? 0);
      }

      setActionMessage(`${creditAmount} credits added to your account.`);
    } catch {
      setActionError("Unable to purchase credits right now.");
    } finally {
      setIsPurchasingCredits(null);
    }
  };

  const handleConnectionRequest = async (matchedUser: UserProfile) => {
    const matchedProfileId = matchedUser.id;

    try {
      setPendingConnectionAction(`request-${matchedProfileId}`);
      setActionError(null);
      setActionMessage(null);

      await connectionService.request(matchedProfileId);
      await refreshConnections();
      setActionMessage("Connection request sent.");
    } catch (error) {
      setActionError(
        extractActionErrorMessage(error, "Unable to send connection request right now."),
      );
    } finally {
      setPendingConnectionAction(null);
    }
  };

  const handleConnectionAction = async (
    connection: Connection,
    action: "accept" | "decline" | "cancel" | "disconnect",
  ) => {
    try {
      setPendingConnectionAction(`${action}-${connection.id}`);
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
      setPendingConnectionAction(null);
    }
  };

  if (!token) {
    return (
      <HomeShell
        actions={
          <>
            <MiniActionLink href="/login">Login</MiniActionLink>
            <MiniActionLink href="/register" tone="gold">
              Register
            </MiniActionLink>
          </>
        }
      >
        <Surface className="overflow-hidden">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#eabfb9]">
                Compatibility Workspace
              </p>
              <h1 className="mt-5 max-w-3xl font-display text-5xl font-semibold tracking-tight text-white sm:text-6xl">
                For the best <RotatingHeroWord /> <br/>of your life.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[#eabfb9]">
                Sign in to access saved profiles, recent compatibility history, and
                premium insight layers tied to your account.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <MiniActionLink href="/login" tone="gold">
                  Continue to compatibility
                </MiniActionLink>
                <MiniActionLink href="/register">Create account</MiniActionLink>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-[#eabfb9]/20 bg-[linear-gradient(180deg,rgba(162,46,52,0.35)_0%,rgba(12,13,10,0.72)_100%)] p-6">
              <p className="text-sm font-semibold text-[#f5d5c8]">How the app works</p>
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-medium text-white">1. Create your profile</p>
                  <p className="mt-2 text-sm leading-6 text-[#eabfb9]">
                    Save your own birth details once and reuse them for every check.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-medium text-white">2. Add private persons</p>
                  <p className="mt-2 text-sm leading-6 text-[#eabfb9]">
                    Keep your comparison set ready for repeated compatibility runs.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-medium text-white">3. Unlock deeper insights</p>
                  <p className="mt-2 text-sm leading-6 text-[#eabfb9]">
                    Use credits to reveal more of the compatibility picture.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Surface>
      </HomeShell>
    );
  }

  return (
    <HomeShell
      actions={
        <>
          <MiniActionLink href="/dashboard">Dashboard</MiniActionLink>
          <MiniActionLink href="/connections" badge={totalUnreadCount}>
            Connections
          </MiniActionLink>
          <MiniActionLink href="/results">Results</MiniActionLink>
          <LogoutButton />
        </>
      }
    >
      <Surface className="overflow-hidden">
          <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr] xl:items-end">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#eabfb9]">
                Personalized Action Zone
              </p>
              <h1 className="mt-5 max-w-3xl font-display text-5xl font-semibold tracking-tight text-white sm:text-6xl">
                {greetingName === "Welcome back"
                  ? "Check compatibility while the signal is fresh."
                  : `${greetingName}, check compatibility while the signal is fresh.`}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[#eabfb9]">
                Get your compatibility score instantly, surface the strongest signals first,
                and move straight into deeper insights when the match looks promising.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  className="rounded-full border-0 bg-[linear-gradient(135deg,#c07771_0%,#f5d5c8_100%)] px-7 py-4 text-base font-semibold text-[#0c0d0a] hover:bg-[linear-gradient(135deg,#eabfb9_0%,#f5d5c8_100%)]"
                  disabled={isRunningCheck || isLoading}
                  onClick={handleRunCompatibility}
                >
                  {profile && selectedPerson
                    ? isRunningCheck
                      ? "Running compatibility..."
                      : "Check Compatibility Now"
                    : profile
                      ? "Choose a partner to start"
                      : "Set up your profile first"}
                </Button>
                <MiniActionLink href="/compatibility">Open advanced compatibility</MiniActionLink>
              </div>

              {actionError ? (
                <div className="mt-4 rounded-2xl border border-[#a22e34]/35 bg-[#901214]/15 px-4 py-3 text-sm text-[#f5d5c8]">
                  {actionError}
                </div>
              ) : null}
              {actionMessage ? (
                <div className="mt-4 rounded-2xl border border-[#eabfb9]/25 bg-[#eabfb9]/10 px-4 py-3 text-sm text-[#eabfb9]">
                  {actionMessage}
                </div>
              ) : null}
              {loadError ? (
                <div className="mt-4 rounded-2xl border border-[#a22e34]/35 bg-[#901214]/15 px-4 py-3 text-sm text-[#f5d5c8]">
                  {loadError}
                </div>
              ) : null}
            </div>

            <div className="rounded-[1.75rem] border border-[#eabfb9]/20 bg-[linear-gradient(180deg,rgba(162,46,52,0.35)_0%,rgba(12,13,10,0.74)_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Quick run</p>
                <span className="rounded-full border border-[#f5d5c8]/25 bg-[#f5d5c8]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f5d5c8]">
                  Instant Score
                </span>
              </div>

              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b2806b]">
                    Your profile
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {profile ? "Ready for comparison" : "Missing required profile"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#eabfb9]">
                    {profile
                      ? `${profile.date_of_birth} at ${profile.time_of_birth} • ${profile.place_of_birth}`
                      : "Create your birth profile before running direct compatibility checks."}
                  </p>
                  {!profile ? (
                    <div className="mt-4">
                      <MiniActionLink href="/profile">Create profile</MiniActionLink>
                    </div>
                  ) : null}
                </div>

                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b2806b]">
                    Select partner
                  </span>
                  <select
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0c0d0a]/70 px-4 py-3 text-sm text-white outline-none transition focus:border-[#eabfb9]"
                    disabled={privatePersons.length === 0 || isLoading}
                    value={selectedPersonId}
                    onChange={(event) => setSelectedPersonId(event.target.value)}
                  >
                    {privatePersons.length === 0 ? (
                      <option value="">No saved private persons</option>
                    ) : null}
                    {privatePersons.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedPerson ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b2806b]">
                      Selected match
                    </p>
                    <p className="mt-2 text-lg font-semibold text-white">{selectedPerson.name}</p>
                    <p className="mt-2 text-sm leading-6 text-[#eabfb9]">
                      {selectedPerson.date_of_birth}
                      {selectedPerson.time_of_birth ? ` at ${selectedPerson.time_of_birth}` : ""}
                      {selectedPerson.place_of_birth
                        ? ` • ${selectedPerson.place_of_birth}`
                        : ""}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/12 bg-white/5 p-4 text-sm leading-6 text-[#eabfb9]">
                    Add a private person to reduce friction and start checking compatibility
                    from the homepage.
                    <div className="mt-4">
                      <MiniActionLink href="/private-persons">Add private person</MiniActionLink>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Surface>

      <Surface>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#eabfb9]">
              Suggested Match for you
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-white/12 bg-white/5 p-5 text-sm text-[#eabfb9] md:col-span-3">
              Loading user matches...
            </div>
          ) : userMatchesLoadError ? (
            <div className="rounded-2xl border border-[#a22e34]/35 bg-[#901214]/15 p-5 text-sm text-[#f5d5c8] md:col-span-3">
              {userMatchesLoadError}
            </div>
          ) : topUserMatches.length > 0 ? (
            topUserMatches.map((match) => {
              const matchedUser = match.matched_user;
              const matchedProfileId = matchedUser.id;
              const imageUrl = matchedUser.profile_picture ?? matchedUser.user?.profile_picture;
              const receivedConnection = getConnectionForProfile(
                receivedConnectionRequests,
                matchedProfileId,
              );
              const existingConnection =
                receivedConnection ?? getConnectionForProfile(connections, matchedProfileId);
              const isAcceptedConnection = existingConnection?.status === "accepted";
              const isPendingConnection = existingConnection?.status === "pending";
              const isReceivedPendingConnection =
                receivedConnection?.status === "pending" ||
                (existingConnection?.receiver?.id === profile?.id && isPendingConnection);

              return (
                <div
                  key={match.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {imageUrl ? (
                        <img
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-full border border-[#eabfb9]/20 object-cover"
                          src={imageUrl}
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#eabfb9]/20 bg-[#f5d5c8]/10 text-sm font-semibold text-[#f5d5c8]">
                          {getProfileInitials(matchedUser)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-white">
                          {getProfileDisplayName(matchedUser)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 space-y-2 text-sm leading-6 text-[#eabfb9]">
                    {matchedUser.gender ? <p>{matchedUser.gender}</p> : null}
                    {matchedUser.date_of_birth ? <p>{matchedUser.date_of_birth}</p> : null}
                    {matchedUser.place_of_birth ? <p>{matchedUser.place_of_birth}</p> : null}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {isAcceptedConnection && existingConnection ? (
                      <>
                        <span className="inline-flex items-center rounded-full border border-[#eabfb9]/20 bg-[#eabfb9]/10 px-3 py-2 text-xs font-semibold text-[#f5d5c8]">
                          Connected
                        </span>
                        <Button
                          className="px-4 py-2 text-xs"
                          disabled={
                            pendingConnectionAction === `disconnect-${existingConnection.id}`
                          }
                          variant="ghost"
                          onClick={() => handleConnectionAction(existingConnection, "disconnect")}
                        >
                          {pendingConnectionAction === `disconnect-${existingConnection.id}`
                            ? "Disconnecting..."
                            : "Disconnect"}
                        </Button>
                      </>
                    ) : isReceivedPendingConnection && existingConnection ? (
                      <>
                        <Button
                          className="px-4 py-2 text-xs"
                          disabled={pendingConnectionAction === `accept-${existingConnection.id}`}
                          onClick={() => handleConnectionAction(existingConnection, "accept")}
                        >
                          {pendingConnectionAction === `accept-${existingConnection.id}`
                            ? "Accepting..."
                            : "Accept"}
                        </Button>
                        <Button
                          className="px-4 py-2 text-xs"
                          disabled={pendingConnectionAction === `decline-${existingConnection.id}`}
                          variant="ghost"
                          onClick={() => handleConnectionAction(existingConnection, "decline")}
                        >
                          {pendingConnectionAction === `decline-${existingConnection.id}`
                            ? "Declining..."
                            : "Decline"}
                        </Button>
                      </>
                    ) : isPendingConnection && existingConnection ? (
                      <Button
                        className="px-4 py-2 text-xs"
                        disabled={pendingConnectionAction === `cancel-${existingConnection.id}`}
                        variant="ghost"
                        onClick={() => handleConnectionAction(existingConnection, "cancel")}
                      >
                        {pendingConnectionAction === `cancel-${existingConnection.id}`
                          ? "Cancelling..."
                          : "Request Sent"}
                      </Button>
                    ) : (
                      <Button
                        className="px-4 py-2 text-xs"
                        disabled={
                          Boolean(connectionsLoadError) ||
                          pendingConnectionAction === `request-${matchedProfileId}`
                        }
                        onClick={() => handleConnectionRequest(matchedUser)}
                      >
                        {connectionsLoadError
                          ? "Unavailable"
                          : pendingConnectionAction === `request-${matchedProfileId}`
                          ? "Connecting..."
                          : "Connect"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-white/12 bg-white/5 p-5 text-sm leading-7 text-[#eabfb9] md:col-span-3">
              UserMatch records will appear here once the API returns matched users.
            </div>
          )}
        </div>
      </Surface>

      <Surface>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#eabfb9]">
              Connection Requests
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-white/12 bg-white/5 p-5 text-sm text-[#eabfb9]">
              Loading connection requests...
            </div>
          ) : connectionsLoadError ? (
            <div className="rounded-2xl border border-[#a22e34]/35 bg-[#901214]/15 p-5 text-sm text-[#f5d5c8]">
              {connectionsLoadError}
            </div>
          ) : pendingReceivedConnectionRequests.length > 0 ? (
            pendingReceivedConnectionRequests.map((connection) => {
              const peer = getConnectionPeer(connection, profile?.id);

              return (
                <div
                  key={connection.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div>
                    <p className="text-base font-semibold text-white">
                      {getProfileDisplayName(peer)}
                    </p>
                    {peer.place_of_birth ? (
                      <p className="mt-2 text-sm text-[#eabfb9]">{peer.place_of_birth}</p>
                    ) : null}
                    <p className="mt-2 text-sm text-[#eabfb9]">
                      Sent {formatTimestamp(connection.requested_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="px-4 py-2 text-xs"
                      disabled={pendingConnectionAction === `accept-${connection.id}`}
                      onClick={() => handleConnectionAction(connection, "accept")}
                    >
                      {pendingConnectionAction === `accept-${connection.id}`
                        ? "Accepting..."
                        : "Accept"}
                    </Button>
                    <Button
                      className="px-4 py-2 text-xs"
                      disabled={pendingConnectionAction === `decline-${connection.id}`}
                      variant="ghost"
                      onClick={() => handleConnectionAction(connection, "decline")}
                    >
                      {pendingConnectionAction === `decline-${connection.id}`
                        ? "Declining..."
                        : "Decline"}
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-white/12 bg-white/5 p-5 text-sm leading-7 text-[#eabfb9]">
              No pending connection requests.
            </div>
          )}
        </div>
      </Surface>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_0.85fr]">
        <Surface>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#eabfb9]">
                Instant Value Preview
              </p>
              <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-white">
                See partial value before you go deeper.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#eabfb9]">
                Surface the score and a couple of free signals immediately, then use the
                deeper layers to create curiosity and trigger the next action.
              </p>
            </div>
            <MiniActionLink href="/results" tone="gold">
              Open full results
            </MiniActionLink>
          </div>

          {isLoading ? (
            <div className="mt-8 rounded-[1.75rem] border border-dashed border-white/12 bg-white/5 p-8 text-sm text-[#eabfb9]">
              Loading compatibility preview...
            </div>
          ) : previewResult ? (
            <div className="mt-8 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
              <div className="rounded-[1.75rem] border border-[#eabfb9]/20 bg-[linear-gradient(180deg,rgba(162,46,52,0.4)_0%,rgba(12,13,10,0.74)_100%)] p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#eabfb9]">
                  Sample Compatibility
                </p>
                <p className="mt-4 text-sm text-[#eabfb9]">{previewResult.personName}</p>
                <CompatibilityScoreLine
                  className="mt-6"
                  label="Compatibility Score"
                  score={previewResult.score}
                  tone="dark"
                />
                <p className="mt-5 text-sm leading-7 text-[#eabfb9]">
                  {previewResult.summary ?? "This result already indicates enough signal to justify a deeper review."}
                </p>
                <p className="mt-6 text-xs uppercase tracking-[0.24em] text-[#b2806b]/80">
                  {formatTimestamp(previewResult.createdAt)}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {visiblePreviewParameters.length > 0 ? (
                  visiblePreviewParameters.map((parameter) => (
                    <div
                      key={parameter.key}
                      className="rounded-2xl border border-white/10 bg-white/5 p-5"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#eabfb9]">
                        Visible Insight
                      </p>
                      <p className="mt-3 text-sm font-medium text-white">{parameter.label}</p>
                      <p className="mt-3 text-sm leading-7 text-[#eabfb9]">{parameter.value}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/12 bg-white/5 p-5 text-sm leading-7 text-[#eabfb9] md:col-span-2">
                    The selected result does not contain parameter breakdowns yet.
                  </div>
                )}

                {premiumPreviewParameters.map((parameter) => (
                  <LockedInsightCard
                    key={`locked-${parameter.key}`}
                    cta="Unlock deeper insights"
                    label={parameter.label}
                    value={parameter.value}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-8 rounded-[1.75rem] border border-dashed border-white/12 bg-white/5 p-8 text-sm leading-7 text-[#eabfb9]">
              No compatibility results are available yet. Run your first check to turn this
              section into a conversion preview.
            </div>
          )}
        </Surface>

        <Surface>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f5d5c8]">
            Paywall Nudge
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-white">
            See the full picture before making decisions.
          </h2>
          <p className="mt-4 text-sm leading-7 text-[#eabfb9]">
            High-level scores help you rank matches. Premium layers help you understand why
            the signal looks strong, weak, or complicated.
          </p>

          <div className="mt-6 space-y-3">
            {premiumPreviewParameters.length > 0 ? (
              premiumPreviewParameters.map((parameter) => (
                <div
                  key={`nudge-${parameter.key}`}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
                >
                  <p className="text-sm font-medium text-white">{parameter.label}</p>
                  <p className="mt-2 select-none text-sm text-[#eabfb9] blur-sm">
                    {parameter.value}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/12 bg-white/5 px-4 py-4 text-sm leading-7 text-[#eabfb9]">
                Premium preview cards appear here once the API returns parameter-rich
                compatibility results.
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              className="rounded-full border-0 bg-[linear-gradient(135deg,#c07771_0%,#f5d5c8_100%)] px-6 text-[#0c0d0a] hover:bg-[linear-gradient(135deg,#eabfb9_0%,#f5d5c8_100%)]"
              disabled={isPurchasingCredits !== null}
              onClick={() => handlePurchaseCredits(15)}
            >
              {isPurchasingCredits === 15 ? "Processing..." : "Buy Credits"}
            </Button>
            <MiniActionLink href="/results">Review existing results</MiniActionLink>
          </div>
        </Surface>
      </div>

    </HomeShell>
  );
}
