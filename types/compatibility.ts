import type { ApiMeta } from "@/types/common";

export interface CompatibilityRequest {
  matched_user_id?: number | string;
  matched_private_person_id?: number | string;
  [key: string]: unknown;
}

export interface CompatibilityResult {
  id?: number | string;
  score?: number;
  overall_score?: number;
  summary?: string;
  description?: string;
  created_at?: string;
  matched_user?: number | string;
  matched_user_username?: string;
  matched_private_person?: number | string;
  matched_private_person_name?: string;
  is_private_match?: boolean;
  parameters?: CompatibilityParameter[];
  [key: string]: unknown;
}

export interface CompatibilityParameter {
  key: string;
  label: string;
  score: number | string;
  locked: boolean;
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
