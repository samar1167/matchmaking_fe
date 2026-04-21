export interface ChatConversationUser {
  id: number;
  first_name?: string;
  last_name?: string;
  place_of_birth?: string | null;
}

export interface ChatMessage {
  id: number;
  conversation: number;
  sender: number;
  receiver: number;
  sender_user_id: number;
  receiver_user_id: number;
  body: string;
  client_message_id?: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface ChatConversation {
  id: number;
  connection: number;
  other_user: ChatConversationUser;
  last_message: ChatMessage | null;
  last_message_at: string | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChatMessagesResponse {
  results: ChatMessage[];
  next_before: number | null;
}

export interface SendChatMessagePayload {
  body: string;
  client_message_id?: string;
}

export interface ChatReadResponse {
  type: "conversation.read";
  conversationId: number;
  unreadCount: number;
  totalUnreadCount: number;
}

export interface ChatUnreadCountResponse {
  totalUnreadCount: number;
}
