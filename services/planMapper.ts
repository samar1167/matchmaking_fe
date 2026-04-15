import type { PlanParameters, PlanParametersResponse } from "@/types/plan";

const toObject = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

const humanizeKey = (value: string) =>
  value
    .replace(/[_.]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const normalizePlanParameters = (
  payload: PlanParametersResponse["parameters"],
): PlanParameters => {
  if (!payload) {
    return {};
  }

  if (Array.isArray(payload)) {
    return payload.reduce<PlanParameters>((accumulator, item) => {
      accumulator[item.key] = {
        key: item.key,
        name: item.name,
        description: item.description,
        free: Boolean(item.free),
        paid: Boolean(item.paid),
        enabled: item.enabled,
      };

      return accumulator;
    }, {});
  }

  const parameters: PlanParameters = {};

  Object.entries(payload).forEach(([key, value]) => {
    const objectValue = toObject(value);
    const freeValue =
      typeof objectValue?.free === "boolean"
        ? objectValue.free
        : typeof value === "boolean"
          ? value
          : true;

    parameters[key] = {
      key,
      name:
        typeof objectValue?.name === "string" ? objectValue.name : humanizeKey(key),
      description:
        typeof objectValue?.description === "string" ? objectValue.description : undefined,
      free: freeValue,
      paid:
        typeof objectValue?.paid === "boolean" ? objectValue.paid : !freeValue,
      enabled:
        typeof objectValue?.enabled === "boolean" ? objectValue.enabled : undefined,
    };
  });

  return parameters;
};
