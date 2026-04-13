import { apiClient } from "@/services/api/client";
import type {
  PaymentHistoryResponse,
  PlanMeResponse,
  PlanParametersResponse,
  PurchasePlanRequest,
  PurchasePlanResponse,
} from "@/types/plan";

export const planService = {
  async getCurrent(): Promise<PlanMeResponse> {
    const { data } = await apiClient.get<PlanMeResponse>("/plan/me/");
    return data;
  },

  async getParameters(): Promise<PlanParametersResponse> {
    const { data } = await apiClient.get<PlanParametersResponse>("/plan/parameters/");
    return data;
  },

  async getPaymentHistory(): Promise<PaymentHistoryResponse> {
    const { data } = await apiClient.get<PaymentHistoryResponse>(
      "/plan/payment_history/",
    );
    return data;
  },

  async purchase(payload: PurchasePlanRequest): Promise<PurchasePlanResponse> {
    const { data } = await apiClient.post<PurchasePlanResponse>(
      "/plan/purchase/",
      payload,
    );
    return data;
  },
};
