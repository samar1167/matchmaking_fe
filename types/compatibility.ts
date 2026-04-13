import type { ApiMeta } from "@/types/common";

export interface CompatibilityRequest {
  private_person_id?: number | string;
  target_profile_id?: number | string;
  profile_id?: number | string;
  [key: string]: unknown;
}

export interface CompatibilityResult {
  id?: number | string;
  score?: number;
  summary?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface CompatibilityResponse {
  result?: CompatibilityResult;
  [key: string]: unknown;
}

export interface CompatibilityHistoryResponse {
  results?: CompatibilityResult[];
  history?: CompatibilityResult[];
  meta?: ApiMeta;
  [key: string]: unknown;
}

export interface TopMatchesResponse {
  matches?: CompatibilityResult[];
  results?: CompatibilityResult[];
  meta?: ApiMeta;
  [key: string]: unknown;
}
