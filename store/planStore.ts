import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { PlanParameters } from "@/types/plan";

interface PlanState {
  credits: number;
  parameters: PlanParameters;
  setCredits: (credits: number) => void;
  setParameters: (parameters: PlanParameters) => void;
  resetPlanState: () => void;
}

const defaultParameters: PlanParameters = {
};

export const usePlanStore = create<PlanState>()(
  persist(
    (set) => ({
      credits: 0,
      parameters: defaultParameters,
      setCredits: (credits) => {
        set({ credits });
      },
      setParameters: (parameters) => {
        set({ parameters });
      },
      resetPlanState: () => {
        set({
          credits: 0,
          parameters: defaultParameters,
        });
      },
    }),
    {
      name: "matchmaking-plan",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export const planStore = usePlanStore;
