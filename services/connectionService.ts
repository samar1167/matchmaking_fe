import { apiClient } from "@/services/api/client";
import type {
  Connection,
  ConnectionListResponse,
  ConnectionRequestPayload,
} from "@/types/connection";

const isConnection = (value: unknown): value is Connection =>
  typeof value === "object" && value !== null && "id" in value;

const normalizeConnectionListResponse = (payload: unknown): ConnectionListResponse => {
  if (payload && typeof payload === "object" && "results" in payload) {
    const results = (payload as { results?: unknown }).results;

    if (Array.isArray(results)) {
      return payload as ConnectionListResponse;
    }
  }

  if (Array.isArray(payload)) {
    return {
      count: payload.length,
      next: null,
      previous: null,
      results: payload.filter(isConnection),
    };
  }

  if (isConnection(payload)) {
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

export const connectionService = {
  async list(params?: { status?: string; role?: string }): Promise<ConnectionListResponse> {
    const { data } = await apiClient.get<unknown>("/connections/", { params });
    return normalizeConnectionListResponse(data);
  },

  async pending(): Promise<ConnectionListResponse> {
    const { data } = await apiClient.get<unknown>("/connections/pending/");
    return normalizeConnectionListResponse(data);
  },

  async received(): Promise<ConnectionListResponse> {
    const { data } = await apiClient.get<unknown>("/connections/received/");
    return normalizeConnectionListResponse(data);
  },

  async sent(): Promise<ConnectionListResponse> {
    const { data } = await apiClient.get<unknown>("/connections/sent/");
    return normalizeConnectionListResponse(data);
  },

  async accepted(): Promise<ConnectionListResponse> {
    const { data } = await apiClient.get<unknown>("/connections/accepted/");
    return normalizeConnectionListResponse(data);
  },

  async request(matchedUserProfileId: number | string): Promise<Connection> {
    const payload: ConnectionRequestPayload = {
      matched_user_profile_id: matchedUserProfileId,
    };
    const { data } = await apiClient.post<Connection>("/connections/request/", payload);
    return data;
  },

  async accept(id: number | string): Promise<Connection> {
    const { data } = await apiClient.post<Connection>(`/connections/${id}/accept/`);
    return data;
  },

  async decline(id: number | string): Promise<Connection> {
    const { data } = await apiClient.post<Connection>(`/connections/${id}/decline/`);
    return data;
  },

  async cancel(id: number | string): Promise<Connection> {
    const { data } = await apiClient.post<Connection>(`/connections/${id}/cancel/`);
    return data;
  },

  async disconnect(id: number | string): Promise<Connection> {
    const { data } = await apiClient.post<Connection>(`/connections/${id}/disconnect/`);
    return data;
  },
};
