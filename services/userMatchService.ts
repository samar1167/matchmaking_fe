import { apiClient } from "@/services/api/client";
import type { UserMatch, UserMatchListResponse } from "@/types/user-match";

const isUserMatch = (value: unknown): value is UserMatch =>
  typeof value === "object" && value !== null && "id" in value && "matched_user" in value;

const normalizeUserMatchListResponse = (payload: unknown): UserMatchListResponse => {
  if (payload && typeof payload === "object" && "results" in payload) {
    const results = (payload as { results?: unknown }).results;

    if (Array.isArray(results)) {
      return payload as UserMatchListResponse;
    }
  }

  if (Array.isArray(payload)) {
    return {
      count: payload.length,
      next: null,
      previous: null,
      results: payload.filter(isUserMatch),
    };
  }

  return {
    count: 0,
    next: null,
    previous: null,
    results: [],
  };
};

export const userMatchService = {
  async list(): Promise<UserMatchListResponse> {
    const { data } = await apiClient.get("/user-matches/");
    return normalizeUserMatchListResponse(data);
  },
};
