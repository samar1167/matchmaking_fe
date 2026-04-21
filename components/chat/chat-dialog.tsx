"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertMessage, BodyText, EmptyState } from "@/components/ui/design-system";
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

const mergeConversation = (
  conversations: ChatConversation[],
  incoming: ChatConversation,
) => {
  const existingIndex = conversations.findIndex(
    (conversation) => conversation.id === incoming.id,
  );

  const next =
    existingIndex >= 0
      ? conversations.map((conversation, index) =>
          index === existingIndex ? incoming : conversation,
        )
      : [incoming, ...conversations];

  return next.sort((first, second) => {
    const firstDate = first.last_message_at ?? first.updated_at ?? first.created_at;
    const secondDate = second.last_message_at ?? second.updated_at ?? second.created_at;

    return new Date(secondDate).getTime() - new Date(firstDate).getTime();
  });
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
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
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

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === readResponse.conversationId
            ? { ...conversation, unread_count: 0 }
            : conversation,
        ),
      );
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

  const selectConversation = async (conversation: ChatConversation) => {
    setSelectedConversation(conversation);
    await loadMessages(conversation);
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

        const [conversationList, createdConversation] = await Promise.all([
          chatService.listConversations(),
          initialConnection
            ? chatService.fromConnection(initialConnection.id)
            : Promise.resolve(null),
        ]);

        if (cancelled) {
          return;
        }

        const mergedConversations = createdConversation
          ? mergeConversation(conversationList, createdConversation)
          : conversationList;
        const selected = createdConversation ?? mergedConversations[0] ?? null;

        setConversations(mergedConversations);
        setSelectedConversation(selected);

        if (selected) {
          await loadMessages(selected);
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
          setConversations((current) =>
            current.map((conversation) =>
              conversation.id === payload.conversationId
                ? { ...conversation, unread_count: 0 }
                : conversation,
            ),
          );
          setSelectedConversation((current) =>
            current?.id === payload.conversationId
              ? { ...current, unread_count: 0 }
              : current,
          );
          onConversationRead?.(payload.conversationId);
          return;
        }

        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === payload.conversationId
              ? {
                  ...conversation,
                  last_message: payload.message,
                  last_message_at: payload.message.created_at,
                  unread_count:
                    selectedConversationIdRef.current === payload.conversationId
                      ? 0
                      : payload.unreadCount,
                  updated_at: payload.message.created_at,
                }
              : conversation,
          ),
        );

        if (selectedConversationIdRef.current === payload.conversationId) {
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
      setConversations((current) =>
        mergeConversation(current, {
          ...selectedConversation,
          last_message: message,
          last_message_at: message.created_at,
          unread_count: 0,
          updated_at: message.created_at,
        }),
      );
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
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[1.5rem] border border-[rgba(144,18,20,0.16)] bg-[#fafafa] shadow-[0_30px_80px_rgba(12,13,10,0.24)]">
        <header className="flex items-center justify-between gap-4 border-b border-[rgba(144,18,20,0.1)] px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">
              Chat
            </p>
            <h2 className="mt-1 font-display text-3xl font-semibold tracking-tight text-primary">
              {getConversationName(selectedConversation)}
            </h2>
          </div>
          <button
            aria-label="Close chat"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(144,18,20,0.12)] text-lg font-semibold text-foreground/70 transition hover:border-accent hover:text-primary"
            type="button"
            onClick={onClose}
          >
            x
          </button>
        </header>

        <div className="grid min-h-0 flex-1 md:grid-cols-[18rem_1fr]">
          <aside className="min-h-0 border-b border-[rgba(144,18,20,0.1)] bg-[#f5d5c8]/32 md:border-b-0 md:border-r">
            <div className="max-h-52 overflow-y-auto p-3 md:max-h-none md:h-[calc(92vh-5.5rem)]">
              {isLoading ? <EmptyState>Loading chats...</EmptyState> : null}
              {!isLoading && conversations.length === 0 ? (
                <EmptyState>No conversations yet.</EmptyState>
              ) : null}
              <div className="grid gap-2">
                {conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-[1rem] border p-3 text-left transition",
                      selectedConversation?.id === conversation.id
                        ? "border-accent bg-[#fafafa] shadow-[0_12px_26px_rgba(12,13,10,0.08)]"
                        : "border-transparent hover:border-[rgba(144,18,20,0.12)] hover:bg-[#fafafa]/70",
                    )}
                    type="button"
                    onClick={() => {
                      void selectConversation(conversation);
                    }}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eabfb9] text-xs font-bold text-primary">
                      {getConversationInitials(conversation)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-foreground">
                          {getConversationName(conversation)}
                        </span>
                        {conversation.unread_count > 0 ? (
                          <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
                            {conversation.unread_count}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-1 block truncate text-xs text-foreground/56">
                        {conversation.last_message?.body ?? "No messages yet"}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <section className="flex min-h-[32rem] flex-col">
            <div className="border-b border-[rgba(144,18,20,0.1)] px-5 py-3">
              {selectedConversation?.other_user.place_of_birth ? (
                <BodyText>{selectedConversation.other_user.place_of_birth}</BodyText>
              ) : (
                <BodyText>Conversation #{selectedConversation?.id ?? "-"}</BodyText>
              )}
            </div>

            {error ? <AlertMessage className="m-4">{error}</AlertMessage> : null}

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {selectedConversation && nextBefore ? (
                <div className="mb-4 flex justify-center">
                  <Button
                    className="px-4 py-2 text-xs"
                    disabled={isLoadingOlder}
                    variant="secondary"
                    onClick={handleLoadOlder}
                  >
                    {isLoadingOlder ? "Loading..." : "Load older"}
                  </Button>
                </div>
              ) : null}

              {isLoadingMessages ? <EmptyState>Loading messages...</EmptyState> : null}
              {!isLoadingMessages && selectedConversation && visibleMessages.length === 0 ? (
                <EmptyState>Start the conversation with a message.</EmptyState>
              ) : null}
              {!selectedConversation && !isLoading ? (
                <EmptyState>Select a conversation to begin.</EmptyState>
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
                          "max-w-[78%] rounded-[1.15rem] px-4 py-3 text-sm leading-6 shadow-[0_10px_24px_rgba(12,13,10,0.06)]",
                          isCurrentUser
                            ? "border border-[#901214] bg-[#901214] text-[#fafafa]"
                            : "border border-[rgba(144,18,20,0.1)] bg-[#f5d5c8]/60 text-foreground",
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
            </div>

            <form
              className="border-t border-[rgba(144,18,20,0.1)] p-4"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSend();
              }}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="min-w-0 flex-1">
                  <span className="sr-only">Message</span>
                  <textarea
                    className="max-h-36 min-h-14 w-full resize-none rounded-[1.2rem] border border-[rgba(144,18,20,0.12)] bg-[#fafafa]/90 px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-foreground/35 focus:border-accent focus:shadow-[0_14px_34px_rgba(12,13,10,0.08)]"
                    disabled={!selectedConversation || isSending}
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
                  className="h-12 px-6"
                  disabled={!selectedConversation || isSending || draft.trim().length === 0}
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
    </div>
  );
}
