import type { ApiMeta } from "@/types/common";

export interface PlanParameter {
  key: string;
  name: string;
  description?: string;
  free?: boolean;
  paid?: boolean;
  enabled?: boolean;
}

export interface PaymentHistoryItem {
  id: number | string;
  amount_usd?: string;
  credits_purchased?: number;
  payment_reference?: string;
  created_at?: string;
  completed_at?: string;
  status?: string;
}

export interface PurchasePlanRequest {
  credits: number;
  payment_reference: string;
}

export interface PlanParameters {
  [key: string]: PlanParameter;
}

export interface PlanMeResponse {
  free_credits?: number;
  paid_credits?: number;
  total_credits?: number;
  paid_credit_price_usd?: string;
  credits_per_purchase?: number;
  credits?: number;
  meta?: ApiMeta;
}

export interface PlanParametersResponse {
  parameters?: PlanParameter[] | PlanParameters | null;
  meta?: ApiMeta;
}

export interface PaymentHistoryResponse {
  payments: PaymentHistoryItem[];
  meta?: ApiMeta;
}

export interface PurchasePlanResponse {
  success?: boolean;
  credits?: number;
  meta?: ApiMeta;
}
