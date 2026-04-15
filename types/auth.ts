import type { ApiMeta } from "@/types/common";

export interface AuthUser {
  id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  profile_picture?: string | null;
}

export interface LoginRequest {
  email: string;
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
  email: string;
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
