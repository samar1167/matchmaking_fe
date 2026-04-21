import { useEffect, useMemo, useRef, useState } from "react";
import { chatService } from "@/services/chatService";
import { useAuthStore } from "@/store/authStore";
import type { ChatConversation, ChatMessage } from "@/types/chat";

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

const toUnreadByConnection = (conversations: ChatConversation[]) => {
  const nextUnreadByConnection = new Map<number, number>();
  const nextConnectionByConversation = new Map<number, number>();

  conversations.forEach((conversation) => {
    nextUnreadByConnection.set(conversation.connection, conversation.unread_count);
    nextConnectionByConversation.set(conversation.id, conversation.connection);
  });

  return { nextUnreadByConnection, nextConnectionByConversation };
};

export function useChatTotalUnreadCount() {
  const token = useAuthStore((state) => state.token);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  useEffect(() => {
    if (!token) {
      setTotalUnreadCount(0);
      return;
    }

    let cancelled = false;

    void chatService.unreadCount().then((response) => {
      if (!cancelled) {
        setTotalUnreadCount(response.totalUnreadCount);
      }
    }).catch(() => {
      if (!cancelled) {
        setTotalUnreadCount(0);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token || typeof WebSocket === "undefined") {
      return;
    }

    const socket = new WebSocket(getWebSocketUrl(token));

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as ChatEvent;

        if (
          payload.type === "message.created" ||
          payload.type === "conversation.read"
        ) {
          setTotalUnreadCount(payload.totalUnreadCount);
        }
      } catch {
        // HTTP fetch remains the source of truth if a socket event is malformed.
      }
    };

    return () => {
      socket.close();
    };
  }, [token]);

  return totalUnreadCount;
}

export function useChatConversationUnreadCounts() {
  const token = useAuthStore((state) => state.token);
  const [unreadByConnection, setUnreadByConnection] = useState<Map<number, number>>(
    () => new Map(),
  );
  const [connectionByConversation, setConnectionByConversation] = useState<
    Map<number, number>
  >(() => new Map());
  const connectionByConversationRef = useRef(connectionByConversation);

  useEffect(() => {
    connectionByConversationRef.current = connectionByConversation;
  }, [connectionByConversation]);

  useEffect(() => {
    if (!token) {
      setUnreadByConnection(new Map());
      setConnectionByConversation(new Map());
      return;
    }

    let cancelled = false;

    void chatService.listConversations().then((conversations) => {
      if (cancelled) {
        return;
      }

      const { nextUnreadByConnection, nextConnectionByConversation } =
        toUnreadByConnection(conversations);

      setUnreadByConnection(nextUnreadByConnection);
      setConnectionByConversation(nextConnectionByConversation);
    }).catch(() => {
      if (!cancelled) {
        setUnreadByConnection(new Map());
        setConnectionByConversation(new Map());
      }
    });

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token || typeof WebSocket === "undefined") {
      return;
    }

    const socket = new WebSocket(getWebSocketUrl(token));

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as ChatEvent;

        if (
          payload.type !== "message.created" &&
          payload.type !== "conversation.read"
        ) {
          return;
        }

        const connectionId = connectionByConversationRef.current.get(
          payload.conversationId,
        );

        if (connectionId) {
          setUnreadByConnection((current) => {
            const next = new Map(current);
            next.set(connectionId, payload.unreadCount);
            return next;
          });
          return;
        }

        void chatService.getConversation(payload.conversationId).then((conversation) => {
          setConnectionByConversation((current) => {
            const next = new Map(current);
            next.set(conversation.id, conversation.connection);
            return next;
          });
          setUnreadByConnection((current) => {
            const next = new Map(current);
            next.set(conversation.connection, conversation.unread_count);
            return next;
          });
        }).catch(() => undefined);
      } catch {
        // HTTP fetch remains the source of truth if a socket event is malformed.
      }
    };

    return () => {
      socket.close();
    };
  }, [token]);

  const getUnreadForConnection = (connectionId: number | string) =>
    unreadByConnection.get(Number(connectionId)) ?? 0;

  const markConversationRead = (conversationId: number | string) => {
    const connectionId = connectionByConversation.get(Number(conversationId));

    if (!connectionId) {
      return;
    }

    setUnreadByConnection((current) => {
      const next = new Map(current);
      next.set(connectionId, 0);
      return next;
    });
  };

  return useMemo(
    () => ({
      getUnreadForConnection,
      markConversationRead,
      unreadByConnection,
    }),
    [unreadByConnection, connectionByConversation],
  );
}
