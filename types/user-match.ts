import type { ApiMeta, PaginatedResponse } from "@/types/common";
import type { UserProfile } from "@/types/profile";

export interface UserMatch {
  id: number;
  first_name?: string;
  last_name?: string;
  gender?: string | null;
  profile_picture?: string | null;
  date_of_birth?: string;
  place_of_birth?: string;
  user?: UserProfile["user"];
  matched_user: UserProfile;
  score: number;
  rank: number;
  created_at?: string;
}

export interface UserMatchListResponse extends PaginatedResponse<UserMatch> {
  meta?: ApiMeta;
}
