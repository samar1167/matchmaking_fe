import { apiClient } from "@/services/api/client";
import type {
  CreatePrivatePersonRequest,
  DeletePrivatePersonResponse,
  PrivatePersonListResponse,
  PrivatePersonResponse,
  UpdatePrivatePersonRequest,
} from "@/types/private-persons";

export const privatePersonsService = {
  async list(page?: number): Promise<PrivatePersonListResponse> {
    const { data } = await apiClient.get<PrivatePersonListResponse>("/private-persons/", {
      params: page ? { page } : undefined,
    });
    return data;
  },

  async getById(privatePersonId: string | number): Promise<PrivatePersonResponse> {
    const { data } = await apiClient.get<PrivatePersonResponse>(
      `/private-persons/${privatePersonId}/`,
    );
    return data;
  },

  async create(
    payload: CreatePrivatePersonRequest,
  ): Promise<PrivatePersonResponse> {
    const { data } = await apiClient.post<PrivatePersonResponse>(
      "/private-persons/",
      payload,
    );
    return data;
  },

  async update(
    privatePersonId: string | number,
    payload: UpdatePrivatePersonRequest,
  ): Promise<PrivatePersonResponse> {
    const { data } = await apiClient.put<PrivatePersonResponse>(
      `/private-persons/${privatePersonId}/`,
      payload,
    );
    return data;
  },

  async remove(privatePersonId: string | number): Promise<DeletePrivatePersonResponse> {
    await apiClient.delete(
      `/private-persons/${privatePersonId}/`,
    );
  },
};
