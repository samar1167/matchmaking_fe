import { apiClient } from "@/services/api/client";
import type {
  ChatConversation,
  ChatMessagesResponse,
  ChatReadResponse,
  ChatUnreadCountResponse,
  SendChatMessagePayload,
} from "@/types/chat";

export const chatService = {
  async listConversations(): Promise<ChatConversation[]> {
    const { data } = await apiClient.get<ChatConversation[]>("/chat/conversations/");
    return data;
  },

  async fromConnection(connectionId: number | string): Promise<ChatConversation> {
    const { data } = await apiClient.post<ChatConversation>(
      `/chat/conversations/from-connection/${connectionId}/`,
    );

    return data;
  },

  async getConversation(conversationId: number | string): Promise<ChatConversation> {
    const { data } = await apiClient.get<ChatConversation>(
      `/chat/conversations/${conversationId}/`,
    );

    return data;
  },

  async listMessages(
    conversationId: number | string,
    params: { limit?: number; before?: number | null } = {},
  ): Promise<ChatMessagesResponse> {
    const { data } = await apiClient.get<ChatMessagesResponse>(
      `/chat/conversations/${conversationId}/messages/`,
      {
        params: {
          limit: params.limit ?? 50,
          before: params.before ?? undefined,
        },
      },
    );

    return data;
  },

  async sendMessage(
    conversationId: number | string,
    payload: SendChatMessagePayload,
  ): Promise<ChatMessagesResponse["results"][number]> {
    const { data } = await apiClient.post<ChatMessagesResponse["results"][number]>(
      `/chat/conversations/${conversationId}/messages/`,
      payload,
    );

    return data;
  },

  async markRead(conversationId: number | string): Promise<ChatReadResponse> {
    const { data } = await apiClient.post<ChatReadResponse>(
      `/chat/conversations/${conversationId}/read/`,
    );

    return data;
  },

  async unreadCount(): Promise<ChatUnreadCountResponse> {
    const { data } = await apiClient.get<ChatUnreadCountResponse>("/chat/unread-count/");
    return data;
  },
};
