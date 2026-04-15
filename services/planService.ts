import { apiClient } from "@/services/api/client";
import type {
  PaymentHistoryResponse,
  PlanMeResponse,
  PlanParametersResponse,
  PurchasePlanRequest,
  PurchasePlanResponse,
} from "@/types/plan";

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

const getNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const getString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const getArray = (value: unknown): unknown[] | undefined =>
  Array.isArray(value) ? value : undefined;

const normalizePlanMeResponse = (payload: unknown): PlanMeResponse => {
  const record = toRecord(payload);

  if (!record) {
    return {};
  }

  const totalCredits =
    getNumber(record.total_credits) ??
    getNumber(record.credits) ??
    getNumber(record.remaining_credits);

  return {
    free_credits: getNumber(record.free_credits),
    paid_credits: getNumber(record.paid_credits),
    total_credits: totalCredits,
    paid_credit_price_usd: getString(record.paid_credit_price_usd),
    credits_per_purchase: getNumber(record.credits_per_purchase),
    credits: totalCredits,
  };
};

const normalizePaymentHistoryItem = (payload: unknown) => {
  const record = toRecord(payload);

  if (!record) {
    return null;
  }

  return {
    id:
      getNumber(record.id) ??
      getString(record.id) ??
      getString(record.payment_reference) ??
      "payment-record",
    amount_usd: getString(record.amount_usd),
    credits_purchased: getNumber(record.credits_purchased),
    payment_reference:
      getString(record.payment_reference),
    created_at: getString(record.created_at),
    completed_at: getString(record.completed_at),
    status: getString(record.status),
  };
};

const normalizePaymentHistoryResponse = (payload: unknown): PaymentHistoryResponse => {
  if (Array.isArray(payload)) {
    return {
      payments: payload
        .map((item) => normalizePaymentHistoryItem(item))
        .filter((item): item is NonNullable<typeof item> => item !== null),
    };
  }

  const record = toRecord(payload);

  if (!record) {
    return { payments: [] };
  }

  const rawPayments =
    getArray(record.payments) ??
    getArray(record.results) ??
    getArray(record.history) ??
    getArray(record.items) ??
    [];

  return {
    payments: rawPayments
      .map((item) => normalizePaymentHistoryItem(item))
      .filter((item): item is NonNullable<typeof item> => item !== null),
    meta: toRecord(record.meta) as PaymentHistoryResponse["meta"],
  };
};

export const planService = {
  async getCurrent(): Promise<PlanMeResponse> {
    const { data } = await apiClient.get("/plan/me/");
    return normalizePlanMeResponse(data);
  },

  async getParameters(): Promise<PlanParametersResponse> {
    const { data } = await apiClient.get<PlanParametersResponse>("/plan/parameters/");
    return data;
  },

  async getPaymentHistory(): Promise<PaymentHistoryResponse> {
    const { data } = await apiClient.get<PaymentHistoryResponse>(
      "/plan/payment_history/",
    );
    return normalizePaymentHistoryResponse(data);
  },

  async purchase(payload: PurchasePlanRequest): Promise<PurchasePlanResponse> {
    const { data } = await apiClient.post<PurchasePlanResponse>(
      "/plan/purchase/",
      payload,
    );
    return data;
  },
};
