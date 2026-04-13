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
  credits?: number;
  amount?: number;
  currency?: string;
  payment_reference?: string;
  created_at?: string;
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
  credits: number;
  meta?: ApiMeta;
}

export interface PlanParametersResponse {
  parameters: PlanParameter[] | PlanParameters;
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
