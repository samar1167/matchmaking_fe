"use client";

import { isAxiosError } from "axios";
import { useEffect, useMemo, useState } from "react";
import { AppScaffold } from "@/components/layout/app-scaffold";
import { Button } from "@/components/ui/button";
import {
  ActionLink,
  AlertMessage,
  BodyText,
  EmptyState,
  designSystem,
} from "@/components/ui/design-system";
import { SectionCard } from "@/components/ui/section-card";
import { cn } from "@/lib/cn";
import { connectionService } from "@/services/connectionService";
import { profileService } from "@/services/profileService";
import { userMatchService } from "@/services/userMatchService";
import type { ApiErrorResponse } from "@/types/common";
import type { Connection } from "@/types/connection";
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

const withDefaultStatus = (
  connections: Connection[],
  status: Connection["status"],
) => connections.map((connection) => ({ ...connection, status: connection.status ?? status }));

const getPageCount = (itemCount: number) => Math.max(1, Math.ceil(itemCount / pageSize));

const paginate = <Item,>(items: Item[], page: number) => {
  const start = (page - 1) * pageSize;

  return items.slice(start, start + pageSize);
};

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
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-foreground/42">
        {label} page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <Button
          className="px-4 py-2 text-xs"
          disabled={page === 1}
          variant="ghost"
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Previous
        </Button>
        <Button
          className="px-4 py-2 text-xs"
          disabled={page === totalPages}
          variant="secondary"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          Next
        </Button>
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
        className="h-12 w-12 shrink-0 rounded-full border border-[rgba(144,18,20,0.12)] object-cover"
        src={imageUrl}
      />
    );
  }

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[rgba(144,18,20,0.12)] bg-[#f5d5c8] text-sm font-semibold text-primary">
      {getProfileInitials(profile)}
    </div>
  );
}

function ConnectionRow({
  actions,
  connection,
  currentProfileId,
  detail,
}: {
  actions?: React.ReactNode;
  connection: Connection;
  currentProfileId?: number;
  detail: string;
}) {
  const peer = getConnectionPeer(connection, currentProfileId);

  return (
    <article className={cn(designSystem.inset, "p-5")}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <ProfileAvatar profile={peer} />
          <div className="min-w-0">
            <h3 className="truncate font-display text-2xl font-semibold tracking-tight text-primary">
              {getProfileDisplayName(peer)}
            </h3>
            {peer.place_of_birth ? (
              <BodyText className="mt-1 leading-6">{peer.place_of_birth}</BodyText>
            ) : null}
            <BodyText className="mt-1 leading-6">{detail}</BodyText>
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
    <article className={cn(designSystem.surfaceInteractive, "flex h-full flex-col")}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <ProfileAvatar profile={matchedUser} />
          <div className="min-w-0">
            <h3 className="truncate font-display text-2xl font-semibold tracking-tight text-primary">
              {getProfileDisplayName(matchedUser)}
            </h3>
          </div>
        </div>
        <div className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white">
          {match.score.toFixed(1)}
        </div>
      </div>

      <div className="mt-5 flex-1 space-y-2 text-sm leading-6 text-foreground/66">
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
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<Connection[]>([]);
  const [sentRequests, setSentRequests] = useState<Connection[]>([]);
  const [userMatches, setUserMatches] = useState<UserMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [connectionsPage, setConnectionsPage] = useState(1);
  const [receivedRequestsPage, setReceivedRequestsPage] = useState(1);
  const [sentRequestsPage, setSentRequestsPage] = useState(1);
  const [suggestionsPage, setSuggestionsPage] = useState(1);

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

        const [profileResponse, userMatchesResponse] = await Promise.all([
          profileService.getMe(),
          userMatchService.list(),
          refreshConnections(),
        ]);

        setCurrentProfile(profileResponse.results?.[0] ?? null);
        setUserMatches(userMatchesResponse.results ?? []);
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

  return (
    <AppScaffold
      title="Connections"
      description="Manage accepted connections, review pending requests, and discover suggested public matches from one place."
      actions={
        <>
          <ActionLink href="/dashboard">Dashboard</ActionLink>
          <ActionLink href="/results" variant="primary">
            Results
          </ActionLink>
        </>
      }
    >
      {loadError ? <AlertMessage>{loadError}</AlertMessage> : null}
      {actionError ? <AlertMessage>{actionError}</AlertMessage> : null}
      {actionMessage ? (
        <div className="rounded-[1.35rem] border border-[rgba(144,18,20,0.12)] bg-[#fafafa]/82 px-4 py-3 text-sm font-medium text-primary">
          {actionMessage}
        </div>
      ) : null}

      <div className="grid gap-8">
        <SectionCard
          eyebrow="Connections"
          title="Accepted connections"
          description="People who have already accepted a connection with your public profile."
        >
          <div className="grid gap-4">
            {isLoading ? <EmptyState>Loading accepted connections...</EmptyState> : null}
            {!isLoading && connections.length === 0 ? (
              <EmptyState>No accepted connections yet.</EmptyState>
            ) : null}
            {!isLoading
              ? paginatedConnections.map((connection) => (
                  <ConnectionRow
                    key={connection.id}
                    connection={connection}
                    currentProfileId={currentProfile?.id}
                    detail={`Connected ${formatTimestamp(
                      connection.responded_at ?? connection.updated_at,
                    )}`}
                    actions={
                      <Button
                        className="px-4 py-2 text-xs"
                        disabled={pendingAction === `disconnect-${connection.id}`}
                        variant="ghost"
                        onClick={() => handleConnectionAction(connection, "disconnect")}
                      >
                        {pendingAction === `disconnect-${connection.id}`
                          ? "Disconnecting..."
                          : "Disconnect"}
                      </Button>
                    }
                  />
                ))
              : null}
          </div>
          <PaginationControls
            label="Connections"
            page={connectionsPage}
            totalPages={connectionsPageCount}
            onPageChange={setConnectionsPage}
          />
        </SectionCard>

        <SectionCard
          eyebrow="Requests"
          title="Connection requests"
          description="Accept or decline incoming requests, and cancel outgoing requests that are still pending."
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="font-display text-3xl font-semibold tracking-tight text-primary">
                Received
              </h3>
              <div className="mt-4 grid gap-4">
                {isLoading ? <EmptyState>Loading received requests...</EmptyState> : null}
                {!isLoading && pendingReceivedRequests.length === 0 ? (
                  <EmptyState>No pending received requests.</EmptyState>
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
                            <Button
                              className="px-4 py-2 text-xs"
                              disabled={pendingAction === `accept-${connection.id}`}
                              onClick={() => handleConnectionAction(connection, "accept")}
                            >
                              {pendingAction === `accept-${connection.id}`
                                ? "Accepting..."
                                : "Accept"}
                            </Button>
                            <Button
                              className="px-4 py-2 text-xs"
                              disabled={pendingAction === `decline-${connection.id}`}
                              variant="ghost"
                              onClick={() => handleConnectionAction(connection, "decline")}
                            >
                              {pendingAction === `decline-${connection.id}`
                                ? "Declining..."
                                : "Decline"}
                            </Button>
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
              <h3 className="font-display text-3xl font-semibold tracking-tight text-primary">
                Sent
              </h3>
              <div className="mt-4 grid gap-4">
                {isLoading ? <EmptyState>Loading sent requests...</EmptyState> : null}
                {!isLoading && pendingSentRequests.length === 0 ? (
                  <EmptyState>No pending sent requests.</EmptyState>
                ) : null}
                {!isLoading
                  ? paginatedSentRequests.map((connection) => (
                      <ConnectionRow
                        key={connection.id}
                        connection={connection}
                        currentProfileId={currentProfile?.id}
                        detail={`Sent ${formatTimestamp(connection.requested_at)}`}
                        actions={
                          <Button
                            className="px-4 py-2 text-xs"
                            disabled={pendingAction === `cancel-${connection.id}`}
                            variant="ghost"
                            onClick={() => handleConnectionAction(connection, "cancel")}
                          >
                            {pendingAction === `cancel-${connection.id}`
                              ? "Cancelling..."
                              : "Cancel"}
                          </Button>
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
        </SectionCard>

        <SectionCard
          eyebrow="Suggestions"
          title="Suggested matches"
          description="Public user matches ranked by the API. Send a connection request when a suggestion looks promising."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {isLoading ? (
              <EmptyState className="md:col-span-2 xl:col-span-3">
                Loading suggestions...
              </EmptyState>
            ) : null}
            {!isLoading && suggestions.length === 0 ? (
              <EmptyState className="md:col-span-2 xl:col-span-3">
                No suggestions are available yet.
              </EmptyState>
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
                            <Button
                              className="px-4 py-2 text-xs"
                              disabled={pendingAction === `accept-${existingConnection.id}`}
                              onClick={() => handleConnectionAction(existingConnection, "accept")}
                            >
                              {pendingAction === `accept-${existingConnection.id}`
                                ? "Accepting..."
                                : "Accept"}
                            </Button>
                            <Button
                              className="px-4 py-2 text-xs"
                              disabled={pendingAction === `decline-${existingConnection.id}`}
                              variant="ghost"
                              onClick={() => handleConnectionAction(existingConnection, "decline")}
                            >
                              {pendingAction === `decline-${existingConnection.id}`
                                ? "Declining..."
                                : "Decline"}
                            </Button>
                          </div>
                        ) : isPending && existingConnection ? (
                          <Button
                            className="px-4 py-2 text-xs"
                            disabled={pendingAction === `cancel-${existingConnection.id}`}
                            variant="ghost"
                            onClick={() => handleConnectionAction(existingConnection, "cancel")}
                          >
                            {pendingAction === `cancel-${existingConnection.id}`
                              ? "Cancelling..."
                              : "Request Sent"}
                          </Button>
                        ) : (
                          <Button
                            className="px-4 py-2 text-xs"
                            disabled={pendingAction === `request-${matchedUser.id}`}
                            onClick={() => handleConnectionRequest(matchedUser)}
                          >
                            {pendingAction === `request-${matchedUser.id}`
                              ? "Connecting..."
                              : "Connect"}
                          </Button>
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
        </SectionCard>
      </div>
    </AppScaffold>
  );
}
