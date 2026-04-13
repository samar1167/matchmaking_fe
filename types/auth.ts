import type { ApiMeta } from "@/types/common";

export interface AuthUser {
  id: number;
  username: string;
  email?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
}

export interface RefreshTokenRequest {
  refresh: string;
}

export interface RefreshTokenResponse {
  access: string;
}

export interface RegisterRequest {
  username: string;
  email?: string;
  password: string;
}

export interface RegisterResponse {
  id: number;
  username: string;
  email?: string;
  meta?: ApiMeta;
}

export interface LogoutResponse {
  success?: boolean;
  meta?: ApiMeta;
}
