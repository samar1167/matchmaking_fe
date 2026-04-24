import type { ApiMeta, PaginatedResponse } from "@/types/common";

export interface PrivatePerson {
  id: number;
  name: string;
  gender?: string | null;
  nickname?: string;
  notes?: string;
  date_of_birth: string;
  time_of_birth?: string | null;
  place_of_birth?: string;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePrivatePersonRequest {
  name: string;
  gender?: string | null;
  nickname?: string;
  notes?: string;
  date_of_birth: string;
  time_of_birth?: string | null;
  place_of_birth?: string;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string;
}

export interface UpdatePrivatePersonRequest extends CreatePrivatePersonRequest {}

export interface PrivatePersonListResponse extends PaginatedResponse<PrivatePerson> {
  meta?: ApiMeta;
}

export interface PrivatePersonResponse extends PrivatePerson {
  meta?: ApiMeta;
}

export type DeletePrivatePersonResponse = void;
