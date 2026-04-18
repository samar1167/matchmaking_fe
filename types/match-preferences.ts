import type { AuthUser } from "@/types/auth";

export interface UserMatchPreference {
  id: number;
  user?: AuthUser;
  preferred_gender?: string | null;
  preferred_age_min?: number | null;
  preferred_age_max?: number | null;
  preferred_city?: string | null;
  preferred_distance_km?: number | null;
  preferred_relationship_intent?: string | null;
  preferred_religion_community?: string | null;
  preferred_mother_tongue?: string | null;
  preferred_education?: string | null;
  preferred_profession?: string | null;
  preferred_marital_status?: string | null;
  modern_methods?: number | null;
  karmic_glue?: number | null;
  ancient_methods?: number | null;
  deal_maker?: number | null;
  sizzle?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface SaveMatchPreferenceRequest {
  preferred_gender?: string | null;
  preferred_age_min?: number | null;
  preferred_age_max?: number | null;
  preferred_city?: string | null;
  preferred_distance_km?: number | null;
  preferred_relationship_intent?: string | null;
  preferred_religion_community?: string | null;
  preferred_mother_tongue?: string | null;
  preferred_education?: string | null;
  preferred_profession?: string | null;
  preferred_marital_status?: string | null;
  modern_methods?: number | null;
  karmic_glue?: number | null;
  ancient_methods?: number | null;
  deal_maker?: number | null;
  sizzle?: number | null;
}
