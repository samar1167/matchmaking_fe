export interface ApiMeta {
  message?: string;
  timestamp?: string;
}

export interface ApiErrorResponse {
  message?: string;
  error?: string;
  code?: string;
  details?: Record<string, string[]>;
  credits_remaining?: number;
  purchase_url?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
