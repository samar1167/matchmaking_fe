import { apiClient } from "@/services/api/client";
import type {
  CompatibilityRequest,
  CompatibilityResponse,
  CompatibilityHistoryResponse,
  TopMatchesResponse,
} from "@/types/compatibility";

export const compatibilityService = {
  async calculate(payload: CompatibilityRequest): Promise<CompatibilityResponse> {
    const { data } = await apiClient.post<CompatibilityResponse>(
      "/compatibility/check/",
      payload,
    );
    return data;
  },

  async history(): Promise<CompatibilityHistoryResponse> {
    const { data } = await apiClient.get<CompatibilityHistoryResponse>(
      "/compatibility/history/",
    );
    return data;
  },

  async topMatches(): Promise<TopMatchesResponse> {
    const { data } = await apiClient.get<TopMatchesResponse>(
      "/compatibility/top_matches/",
    );
    return data;
  },
};
