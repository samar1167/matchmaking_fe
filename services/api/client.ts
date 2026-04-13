import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { authStore } from "@/store/authStore";

const API_BASE_URL = "http://localhost/api";

const attachAuthorizationHeader = (config: InternalAxiosRequestConfig) => {
  const token = authStore.getState().token;

  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }

  return config;
};

const handleUnauthorizedResponse = (error: AxiosError) => {
  if (error.response?.status === 401) {
    authStore.getState().clearSession();
  }

  return Promise.reject(error);
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(attachAuthorizationHeader);
apiClient.interceptors.response.use((response) => response, handleUnauthorizedResponse);
