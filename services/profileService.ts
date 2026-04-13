import { apiClient } from "@/services/api/client";
import type {
  CreateProfileRequest,
  ProfileListResponse,
  ProfileResponse,
  UpdateProfileRequest,
} from "@/types/profile";

export const profileService = {
  async list(): Promise<ProfileListResponse> {
    const { data } = await apiClient.get<ProfileListResponse>("/profiles/");
    return data;
  },

  async getMe(): Promise<ProfileListResponse> {
    const { data } = await apiClient.get<ProfileListResponse>("/profiles/me/");
    return data;
  },

  async createMe(payload: CreateProfileRequest): Promise<ProfileResponse> {
    const { data } = await apiClient.post<ProfileResponse>("/profiles/me/", payload);
    return data;
  },

  async updateMe(payload: UpdateProfileRequest): Promise<ProfileResponse> {
    const { data } = await apiClient.put<ProfileResponse>("/profiles/me/", payload);
    return data;
  },
};
