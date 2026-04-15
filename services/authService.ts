import { apiClient } from "@/services/api/client";
import { authStore } from "@/store/authStore";
import type {
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  RegisterRequest,
  RegisterResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
} from "@/types/auth";

export const authService = {
  async login(payload: LoginRequest): Promise<LoginResponse> {
    const { data } = await apiClient.post<LoginResponse>("/auth/login/", {
      email: payload.email,
      username: payload.email,
      password: payload.password,
    });
    return data;
  },

  async register(payload: RegisterRequest): Promise<RegisterResponse> {
    const { data } = await apiClient.post<RegisterResponse>("/auth/register/", {
      email: payload.email,
      username: payload.email,
      password: payload.password,
    });
    return data;
  },

  async refresh(payload: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    const { data } = await apiClient.post<RefreshTokenResponse>("/auth/refresh/", payload);
    return data;
  },

  async logout(): Promise<LogoutResponse> {
    const { data } = await apiClient.post<LogoutResponse>("/auth/logout/");
    authStore.getState().clearSession();
    return data;
  },
};
