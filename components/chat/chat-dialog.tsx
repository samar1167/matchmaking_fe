"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertMessage, EmptyState } from "@/components/ui/design-system";
import { cn } from "@/lib/cn";
import { chatService } from "@/services/chatService";
import { authStore } from "@/store/authStore";
import type { ChatConversation, ChatMessage } from "@/types/chat";
import type { Connection } from "@/types/connection";

type ChatEvent =
  | {
      type: "message.created";
      conversationId: number;
      message: ChatMessage;
      unreadCount: number;
      totalUnreadCount: number;
    }
  | {
      type: "conversation.read";
      conversationId: number;
      unreadCount: number;
      totalUnreadCount: number;
    };

const messageLimit = 50;

const formatChatTime = (value?: string | null) => {
  if (!value) {
    return "";
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

const getConversationName = (conversation?: ChatConversation | null) => {
  if (!conversation) {
    return "Chat";
  }

  const firstName = conversation.other_user.first_name ?? "";
  const lastName = conversation.other_user.last_name ?? "";
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || `User #${conversation.other_user.id}`;
};

const getConversationInitials = (conversation?: ChatConversation | null) =>
  getConversationName(conversation)
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "CH";

const getConversationPlace = (conversation?: ChatConversation | null) =>
  conversation?.other_user.place_of_birth || "Direct connection";

const getClientMessageId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const mergeMessage = (messages: ChatMessage[], incoming: ChatMessage) => {
  const existingIndex = messages.findIndex(
    (message) =>
      message.id === incoming.id ||
      (incoming.client_message_id &&
        message.client_message_id === incoming.client_message_id),
  );

  if (existingIndex >= 0) {
    return messages.map((message, index) => (index === existingIndex ? incoming : message));
  }

  return [...messages, incoming].sort(
    (first, second) =>
      new Date(first.created_at).getTime() - new Date(second.created_at).getTime(),
  );
};

const getWebSocketUrl = (token: string) => {
  const explicitUrl = process.env.NEXT_PUBLIC_WS_CHAT_URL;

  if (explicitUrl) {
    const url = new URL(explicitUrl);
    url.searchParams.set("token", token);
    return url.toString();
  }

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8001/api";
  const url = new URL(apiBase);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws/chat/";
  url.search = "";
  url.searchParams.set("token", token);

  return url.toString();
};

export function ChatDialog({
  currentProfileId,
  currentUserId,
  initialConnection,
  onConversationRead,
  onClose,
  open,
}: {
  currentProfileId?: number;
  currentUserId?: number;
  initialConnection: Connection | null;
  onConversationRead?: (conversationId: number) => void;
  onClose: () => void;
  open: boolean;
}) {
  const [selectedConversation, setSelectedConversation] =
    useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nextBefore, setNextBefore] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ownMessageKeys, setOwnMessageKeys] = useState<Set<string>>(() => new Set());
  const selectedConversationIdRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const visibleMessages = useMemo(
    () =>
      [...messages].sort(
        (first, second) =>
          new Date(first.created_at).getTime() - new Date(second.created_at).getTime(),
      ),
    [messages],
  );

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversation?.id ?? null;
  }, [selectedConversation?.id]);

  const markConversationRead = async (conversationId: number) => {
    try {
      const readResponse = await chatService.markRead(conversationId);

      setSelectedConversation((current) =>
        current?.id === readResponse.conversationId
          ? { ...current, unread_count: 0 }
          : current,
      );
      onConversationRead?.(readResponse.conversationId);
    } catch {
      // Read state is helpful but should not block the conversation UI.
    }
  };

  const loadMessages = async (conversation: ChatConversation) => {
    setIsLoadingMessages(true);
    setError(null);

    try {
      const response = await chatService.listMessages(conversation.id, {
        limit: messageLimit,
      });

      setMessages(
        [...response.results].sort(
          (first, second) =>
            new Date(first.created_at).getTime() - new Date(second.created_at).getTime(),
        ),
      );
      setNextBefore(response.next_before);
      void markConversationRead(conversation.id);
    } catch {
      setError("Unable to load messages right now.");
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (!open) {
      setDraft("");
      setError(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        setIsLoading(true);
        setError(null);
        setSelectedConversation(null);
        setMessages([]);
        setNextBefore(null);

        const conversation = initialConnection
          ? await chatService.fromConnection(initialConnection.id)
          : null;

        if (cancelled) {
          return;
        }

        setSelectedConversation(conversation);

        if (conversation) {
          await loadMessages(conversation);
        } else {
          setMessages([]);
          setNextBefore(null);
        }
      } catch {
        if (!cancelled) {
          setError("Unable to open chat right now.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initialConnection, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const token = authStore.getState().token;

    if (!token || typeof WebSocket === "undefined") {
      return;
    }

    const socket = new WebSocket(getWebSocketUrl(token));

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as ChatEvent;

        if (payload.type === "conversation.read") {
          setSelectedConversation((current) =>
            current?.id === payload.conversationId
              ? { ...current, unread_count: 0 }
              : current,
          );
          onConversationRead?.(payload.conversationId);
          return;
        }

        if (selectedConversationIdRef.current === payload.conversationId) {
          setSelectedConversation((current) =>
            current?.id === payload.conversationId
              ? {
                  ...current,
                  last_message: payload.message,
                  last_message_at: payload.message.created_at,
                  unread_count: 0,
                  updated_at: payload.message.created_at,
                }
              : current,
          );
          setMessages((current) => mergeMessage(current, payload.message));
          void markConversationRead(payload.conversationId);
        }
      } catch {
        // Ignore malformed socket events; HTTP fetches remain the source of truth.
      }
    };

    return () => {
      socket.close();
    };
  }, [onConversationRead, open]);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [open, visibleMessages.length, selectedConversation?.id]);

  const handleLoadOlder = async () => {
    if (!selectedConversation || !nextBefore) {
      return;
    }

    try {
      setIsLoadingOlder(true);
      setError(null);

      const response = await chatService.listMessages(selectedConversation.id, {
        limit: messageLimit,
        before: nextBefore,
      });

      setMessages((current) =>
        [...response.results, ...current].sort(
          (first, second) =>
            new Date(first.created_at).getTime() - new Date(second.created_at).getTime(),
        ),
      );
      setNextBefore(response.next_before);
    } catch {
      setError("Unable to load older messages right now.");
    } finally {
      setIsLoadingOlder(false);
    }
  };

  const handleSend = async () => {
    if (!selectedConversation || isSending) {
      return;
    }

    const body = draft.trim();

    if (!body) {
      setError("Enter a message before sending.");
      return;
    }

    if (body.length > 4000) {
      setError("Messages can be at most 4000 characters.");
      return;
    }

    try {
      setIsSending(true);
      setError(null);

      const clientMessageId = getClientMessageId();
      setOwnMessageKeys((current) => {
        const next = new Set(current);
        next.add(`client:${clientMessageId}`);
        return next;
      });
      const message = await chatService.sendMessage(selectedConversation.id, {
        body,
        client_message_id: clientMessageId,
      });

      setOwnMessageKeys((current) => {
        const next = new Set(current);
        next.add(`client:${clientMessageId}`);
        next.add(`id:${message.id}`);
        return next;
      });
      setMessages((current) => mergeMessage(current, message));
      setSelectedConversation((current) =>
        current?.id === selectedConversation.id
          ? {
              ...current,
              last_message: message,
              last_message_at: message.created_at,
              unread_count: 0,
              updated_at: message.created_at,
            }
          : current,
      );
      setDraft("");
    } catch {
      setError("Unable to send this message right now.");
    } finally {
      setIsSending(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Chat"
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-[#EABFB9] bg-[#fafafa] shadow-[0_24px_80px_rgba(45,23,24,0.28)]">
        <header className="flex items-start justify-between gap-4 border-b border-[#EABFB9] px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#C07771] bg-[#EABFB9] text-sm font-bold text-[#901214]">
              {getConversationInitials(selectedConversation)}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#A22E34]">
                Direct Chat
              </p>
              <h2 className="mt-1 truncate font-display text-3xl font-bold tracking-tight text-[#2d1718]">
                {getConversationName(selectedConversation)}
              </h2>
              <p className="mt-1 truncate text-sm leading-6 text-[#2d1718]/70">
                {getConversationPlace(selectedConversation)}
              </p>
            </div>
          </div>
          <button
            aria-label="Close chat"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#C07771] bg-[#fafafa] text-xl font-bold text-[#901214] transition hover:border-[#901214]"
            type="button"
            onClick={onClose}
          >
            x
          </button>
        </header>

        <section className="flex min-h-[30rem] flex-1 flex-col">
          {error ? <AlertMessage className="m-4 rounded-lg">{error}</AlertMessage> : null}

          <div className="min-h-0 flex-1 overflow-y-auto bg-[#fffafa] px-4 py-4 sm:px-5">
            {isLoading ? (
              <EmptyState className="rounded-xl p-5">Loading chat...</EmptyState>
            ) : null}
            {!isLoading && !selectedConversation ? (
              <EmptyState className="rounded-xl p-5">
                Chat is unavailable for this connection.
              </EmptyState>
            ) : null}

            {!isLoading ? (
              <>
                {selectedConversation && nextBefore ? (
                  <div className="mb-4 flex justify-center">
                    <Button
                      className="rounded-md px-4 py-2 text-xs"
                      disabled={isLoadingOlder}
                      variant="secondary"
                      onClick={handleLoadOlder}
                    >
                      {isLoadingOlder ? "Loading..." : "Load older"}
                    </Button>
                  </div>
                ) : null}

                {isLoadingMessages ? (
                  <EmptyState className="rounded-xl p-5">Loading messages...</EmptyState>
                ) : null}
                {!isLoadingMessages && selectedConversation && visibleMessages.length === 0 ? (
                  <EmptyState className="rounded-xl p-5">
                    Start the conversation with a message.
                  </EmptyState>
                ) : null}

                <div className="grid gap-3">
                  {visibleMessages.map((message) => {
                    const isCurrentUser =
                      ownMessageKeys.has(`id:${message.id}`) ||
                      (message.client_message_id
                        ? ownMessageKeys.has(`client:${message.client_message_id}`)
                        : false) ||
                      message.sender_user_id === currentUserId ||
                      message.sender === currentProfileId;
                    const senderName = isCurrentUser
                      ? "You"
                      : getConversationName(selectedConversation);

                    return (
                      <div
                        key={`${message.id}-${message.client_message_id ?? "server"}`}
                        className={cn(
                          "flex",
                          isCurrentUser ? "justify-end" : "justify-start",
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[82%] rounded-lg px-4 py-3 text-sm leading-6 shadow-[0_10px_24px_rgba(144,18,20,0.05)]",
                            isCurrentUser
                              ? "border border-[#901214] bg-[#901214] text-[#fafafa]"
                              : "border border-[#EABFB9] bg-[#fafafa] text-[#2d1718]",
                          )}
                        >
                          <p
                            className={cn(
                              "mb-1 text-[11px] font-semibold",
                              isCurrentUser ? "text-[#fafafa]/82" : "text-primary",
                            )}
                          >
                            {senderName}
                          </p>
                          <p className="whitespace-pre-wrap break-words">{message.body}</p>
                          <p
                            className={cn(
                              "mt-1 text-[10px]",
                              isCurrentUser ? "text-white/70" : "text-foreground/45",
                            )}
                          >
                            {formatChatTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </>
            ) : null}
          </div>

          <form
            className="border-t border-[#EABFB9] bg-[#fafafa] p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSend();
            }}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="min-w-0 flex-1">
                <span className="sr-only">Message</span>
                <textarea
                  className="max-h-28 min-h-11 w-full resize-none rounded-md border border-[#C07771] bg-[#fffafa] px-4 py-3 text-sm text-[#2d1718] outline-none transition placeholder:text-[#2d1718]/40 focus:border-[#901214] focus:shadow-[0_10px_22px_rgba(144,18,20,0.08)]"
                  disabled={!selectedConversation || isLoading || isSending}
                  maxLength={4000}
                  placeholder="Type a message"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void handleSend();
                    }
                  }}
                />
              </label>
              <Button
                className="min-h-11 rounded-md px-6 py-3 text-xs font-bold"
                disabled={
                  !selectedConversation ||
                  isLoading ||
                  isSending ||
                  draft.trim().length === 0
                }
                type="submit"
              >
                {isSending ? "Sending..." : "Send"}
              </Button>
            </div>
            <p className="mt-2 text-right text-xs text-foreground/45">
              {draft.length}/4000
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}
