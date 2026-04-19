import type { AuthUser } from "@/types/auth";

export interface UserMatchPreference {
  id: number;
  user?: AuthUser;
  preferred_gender?: string | null;
  preferred_age_min?: number | null;
  preferred_age_max?: number | null;
  preferred_relationship_intent?: string | null;
  preferred_marital_status?: string | null;
  modern_methods?: boolean | null;
  karmic_glue?: boolean | null;
  ancient_methods?: boolean | null;
  deal_maker?: boolean | null;
  sizzle?: boolean | null;
  created_at?: string;
  updated_at?: string;
}

export interface SaveMatchPreferenceRequest {
  preferred_gender?: string | null;
  preferred_age_min?: number | null;
  preferred_age_max?: number | null;
  preferred_relationship_intent?: string | null;
  preferred_marital_status?: string | null;
  modern_methods: boolean;
  karmic_glue: boolean;
  ancient_methods: boolean;
  deal_maker: boolean;
  sizzle: boolean;
}
