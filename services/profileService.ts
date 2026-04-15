import { apiClient } from "@/services/api/client";
import type {
  CreateProfileRequest,
  ProfileListResponse,
  ProfileResponse,
  UpdateProfileRequest,
  UserProfile,
} from "@/types/profile";

const isUserProfile = (value: unknown): value is UserProfile =>
  typeof value === "object" && value !== null && "date_of_birth" in value && "time_of_birth" in value;

const normalizeProfileListResponse = (payload: unknown): ProfileListResponse => {
  if (payload && typeof payload === "object" && "results" in payload) {
    const results = (payload as { results?: unknown }).results;

    if (Array.isArray(results)) {
      return payload as ProfileListResponse;
    }

    if (isUserProfile(results)) {
      return {
        count: 1,
        next: null,
        previous: null,
        results: [results],
      };
    }
  }

  if (Array.isArray(payload)) {
    return {
      count: payload.length,
      next: null,
      previous: null,
      results: payload.filter(isUserProfile),
    };
  }

  if (isUserProfile(payload)) {
    return {
      count: 1,
      next: null,
      previous: null,
      results: [payload],
    };
  }

  return {
    count: 0,
    next: null,
    previous: null,
    results: [],
  };
};

const serializeProfilePayload = (payload: CreateProfileRequest | UpdateProfileRequest) => {
  const shouldUseMultipart =
    payload.profile_picture instanceof File || payload.remove_profile_picture === true;

  if (!shouldUseMultipart) {
    return payload;
  }

  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    if (value === null) {
      formData.append(key, "");
      return;
    }

    if (typeof value === "boolean") {
      formData.append(key, String(value));
      return;
    }

    formData.append(key, value instanceof File ? value : String(value));
  });

  return formData;
};

export const profileService = {
  async list(): Promise<ProfileListResponse> {
    const { data } = await apiClient.get<ProfileListResponse>("/profiles/");
    return data;
  },

  async getMe(): Promise<ProfileListResponse> {
    const { data } = await apiClient.get("/profiles/me/");
    return normalizeProfileListResponse(data);
  },

  async createMe(payload: CreateProfileRequest): Promise<ProfileResponse> {
    const body = serializeProfilePayload(payload);
    const { data } = await apiClient.post<ProfileResponse>("/profiles/me/", body, {
      headers: body instanceof FormData ? { "Content-Type": "multipart/form-data" } : undefined,
    });
    return data;
  },

  async updateMe(payload: UpdateProfileRequest): Promise<ProfileResponse> {
    const body = serializeProfilePayload(payload);
    const { data } = await apiClient.put<ProfileResponse>("/profiles/me/", body, {
      headers: body instanceof FormData ? { "Content-Type": "multipart/form-data" } : undefined,
    });
    return data;
  },
};
