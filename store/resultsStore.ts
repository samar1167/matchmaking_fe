import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface ResultParameter {
  key: string;
  label: string;
  value: string;
  locked?: boolean;
}

export interface StoredCompatibilityResult {
  id: string;
  personId: string;
  personName: string;
  score: number;
  summary?: string;
  createdAt?: string;
  parameters: ResultParameter[];
  raw: Record<string, unknown>;
}

interface ResultsState {
  results: StoredCompatibilityResult[];
  setResults: (results: StoredCompatibilityResult[]) => void;
  appendResults: (results: StoredCompatibilityResult[]) => void;
  clearResults: () => void;
}

export const useResultsStore = create<ResultsState>()(
  persist(
    (set) => ({
      results: [],
      setResults: (results) => {
        set({ results });
      },
      appendResults: (results) => {
        set((state) => ({
          results: [...state.results, ...results],
        }));
      },
      clearResults: () => {
        set({ results: [] });
      },
    }),
    {
      name: "matchmaking-results",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export const resultsStore = useResultsStore;
