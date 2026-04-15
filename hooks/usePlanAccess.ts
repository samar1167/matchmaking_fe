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
      setIsLoading(true);

      try {
        const [planMeResult, parameterResult] = await Promise.allSettled([
          planService.getCurrent(),
          planService.getParameters(),
        ]);

        if (planMeResult.status === "fulfilled") {
          setCredits(planMeResult.value.credits ?? 0);
        } else {
          setCredits(0);
        }

        if (parameterResult.status === "fulfilled") {
          setParameters(normalizePlanParameters(parameterResult.value.parameters));
        } else {
          setParameters({});
        }
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
