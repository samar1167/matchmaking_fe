import type { ApiMeta, PaginatedResponse } from "@/types/common";
import type { AuthUser } from "@/types/auth";

export interface UserProfile {
  id: number;
  user?: AuthUser;
  first_name?: string;
  last_name?: string;
  profile_picture?: string | null;
  date_of_birth?: string;
  time_of_birth?: string;
  place_of_birth?: string;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateProfileRequest {
  first_name?: string;
  last_name?: string;
  profile_picture?: File | null;
  remove_profile_picture?: boolean;
  date_of_birth?: string;
  time_of_birth?: string;
  place_of_birth?: string;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string;
}

export interface UpdateProfileRequest extends CreateProfileRequest {}

export interface ProfileListResponse extends PaginatedResponse<UserProfile> {
  meta?: ApiMeta;
}

export interface ProfileResponse extends UserProfile {
  meta?: ApiMeta;
}
