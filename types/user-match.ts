import type { ApiMeta, PaginatedResponse } from "@/types/common";
import type { UserProfile } from "@/types/profile";

export interface UserMatch {
  id: number;
  matched_user: UserProfile;
  score: number;
  rank: number;
  created_at?: string;
}

export interface UserMatchListResponse extends PaginatedResponse<UserMatch> {
  meta?: ApiMeta;
}
