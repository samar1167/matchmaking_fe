import { apiClient } from "@/services/api/client";
import type { UserMatch, UserMatchListResponse } from "@/types/user-match";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isUserMatch = (value: unknown): value is UserMatch =>
  isRecord(value) && "id" in value;

const getNumber = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const getString = (value: unknown) => (typeof value === "string" ? value : undefined);

const normalizeUserMatch = (value: unknown, index: number): UserMatch | null => {
  if (!isUserMatch(value)) {
    return null;
  }

  const matchedUser = isRecord(value.matched_user)
    ? value.matched_user
    : {
        id: value.id,
        first_name: value.first_name,
        last_name: value.last_name,
        gender: value.gender,
        profile_picture: value.profile_picture,
        date_of_birth: value.date_of_birth,
        place_of_birth: value.place_of_birth,
        user: value.user,
      };

  return {
    ...value,
    matched_user: matchedUser as UserMatch["matched_user"],
    score: getNumber(value.score, 0),
    rank: getNumber(value.rank, index + 1),
    first_name: getString(value.first_name),
    last_name: getString(value.last_name),
    date_of_birth: getString(value.date_of_birth),
    place_of_birth: getString(value.place_of_birth),
  };
};

const normalizeUserMatchListResponse = (payload: unknown): UserMatchListResponse => {
  if (payload && typeof payload === "object" && "results" in payload) {
    const results = (payload as { results?: unknown }).results;

    if (Array.isArray(results)) {
      return {
        ...(payload as UserMatchListResponse),
        results: results
          .map((value, index) => normalizeUserMatch(value, index))
          .filter((value): value is UserMatch => Boolean(value)),
      };
    }
  }

  if (Array.isArray(payload)) {
    const results = payload
      .map((value, index) => normalizeUserMatch(value, index))
      .filter((value): value is UserMatch => Boolean(value));

    return {
      count: results.length,
      next: null,
      previous: null,
      results,
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
