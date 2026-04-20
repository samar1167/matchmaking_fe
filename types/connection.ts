import type { ApiMeta, PaginatedResponse } from "@/types/common";
import type { UserProfile } from "@/types/profile";

export type ConnectionStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled"
  | "disconnected";

export interface Connection {
  id: number;
  first_name?: string;
  last_name?: string;
  place_of_birth?: string;
  profile_picture?: string | null;
  user?: UserProfile["user"];
  requester?: UserProfile;
  receiver?: UserProfile;
  profile_low?: UserProfile;
  profile_high?: UserProfile;
  status?: ConnectionStatus;
  requested_at?: string;
  responded_at?: string | null;
  updated_at?: string;
}

export interface ConnectionListResponse extends PaginatedResponse<Connection> {
  meta?: ApiMeta;
}

export interface ConnectionRequestPayload {
  matched_user_profile_id: number | string;
}
