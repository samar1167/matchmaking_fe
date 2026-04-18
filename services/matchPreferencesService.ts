import { apiClient } from "@/services/api/client";
import type {
  SaveMatchPreferenceRequest,
  UserMatchPreference,
} from "@/types/match-preferences";

const MATCH_PREFERENCES_ENDPOINT = "/match-preferences/me";

const isMatchPreference = (value: unknown): value is UserMatchPreference =>
  typeof value === "object" && value !== null && "id" in value;

const normalizeMatchPreference = (payload: unknown): UserMatchPreference | null => {
  if (isMatchPreference(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object" && "results" in payload) {
    const results = (payload as { results?: unknown }).results;

    if (isMatchPreference(results)) {
      return results;
    }

    if (Array.isArray(results)) {
      return results.find(isMatchPreference) ?? null;
    }
  }

  if (Array.isArray(payload)) {
    return payload.find(isMatchPreference) ?? null;
  }

  return null;
};

export const matchPreferencesService = {
  async get(): Promise<UserMatchPreference | null> {
    const { data } = await apiClient.get<unknown>(MATCH_PREFERENCES_ENDPOINT);
    return normalizeMatchPreference(data);
  },

  async save(payload: SaveMatchPreferenceRequest): Promise<UserMatchPreference> {
    const { data } = await apiClient.put<UserMatchPreference>(
      MATCH_PREFERENCES_ENDPOINT,
      payload,
    );
    return data;
  },
};
