import { apiClient } from "@/services/api/client";
import { authStore } from "@/store/authStore";
import type {
  AuthActionResponse,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  RegisterRequest,
  RegisterResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  ResetPasswordRequest,
  VerifyEmailRequest,
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

  async changePassword(payload: ChangePasswordRequest): Promise<AuthActionResponse> {
    const { data } = await apiClient.post<AuthActionResponse>("/auth/change-password/", payload);
    return data;
  },

  async forgotPassword(payload: ForgotPasswordRequest): Promise<AuthActionResponse> {
    const { data } = await apiClient.post<AuthActionResponse>("/auth/forgot-password/", {
      email: payload.email,
    });
    return data;
  },

  async resetPassword(payload: ResetPasswordRequest): Promise<AuthActionResponse> {
    const { data } = await apiClient.post<AuthActionResponse>("/auth/reset-password/", payload);
    return data;
  },

  async verifyEmail(payload: VerifyEmailRequest): Promise<AuthActionResponse> {
    const { data } = await apiClient.post<AuthActionResponse>("/auth/verify-email/", payload);
    return data;
  },
};
