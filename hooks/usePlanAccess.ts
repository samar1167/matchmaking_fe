"use client";

import { useEffect, useState } from "react";
import { planService } from "@/services/planService";
import { normalizePlanParameters } from "@/services/planMapper";
import { usePlanStore } from "@/store/planStore";

export function usePlanAccess() {
  const credits = usePlanStore((state) => state.credits);
  const parameters = usePlanStore((state) => state.parameters);
  const setCredits = usePlanStore((state) => state.setCredits);
  const setParameters = usePlanStore((state) => state.setParameters);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const [planMe, parameterResponse] = await Promise.all([
          planService.getCurrent(),
          planService.getParameters(),
        ]);

        setCredits(planMe.credits ?? 0);
        setParameters(normalizePlanParameters(parameterResponse.parameters));
      } catch {
        setCredits(0);
        setParameters({});
      } finally {
        setIsLoading(false);
      }
    })();
  }, [setCredits, setParameters]);

  return {
    credits,
    isLoading,
    parameters,
  };
}
