import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { planStore } from "@/store/planStore";
import { resultsStore } from "@/store/resultsStore";
import type { AuthUser } from "@/types/auth";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  hasHydrated: boolean;
  setSession: (payload: {
    user: AuthUser | null;
    token: string;
    refreshToken?: string | null;
  }) => void;
  setUser: (user: AuthUser | null) => void;
  clearSession: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      hasHydrated: false,
      setSession: ({ user, token, refreshToken = null }) => {
        set({ user, token, refreshToken });
      },
      setUser: (user) => {
        set({ user });
      },
      clearSession: () => {
        set({ user: null, token: null, refreshToken: null });
        planStore.getState().resetPlanState();
        resultsStore.getState().clearResults();
      },
      setHasHydrated: (value) => {
        set({ hasHydrated: value });
      },
    }),
    {
      name: "matchmaking-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

export const authStore = useAuthStore;
