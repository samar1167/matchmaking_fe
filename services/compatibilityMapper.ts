import type { CompatibilityResult } from "@/types/compatibility";
import type { StoredCompatibilityResult } from "@/store/resultsStore";

const EXCLUDED_KEYS = new Set([
  "id",
  "score",
  "match_score",
  "compatibility_score",
  "total_score",
  "summary",
  "description",
  "interpretation",
  "parameters",
  "created_at",
  "updated_at",
  "person_id",
  "user",
  "matched_user",
  "matched_private_person",
  "matched_user_name",
  "is_private_match",
  "overall_score",
  "upgrade_required",
  "credits_remaining",
  "matched_user_id",
  "matched_private_person_id",
  "private_person_id",
  "profile_id",
  "target_profile_id",
]);

const humanizeKey = (value: string) =>
  value
    .replace(/[_.]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const toObject = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

const toStringValue = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return null;
};

const hasOwnProperty = (value: Record<string, unknown>, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);

const resolveParameterDisplayValue = (parameter: Record<string, unknown>) => {
  const candidates = [
    parameter.score,
    parameter.value,
    parameter.result,
    parameter.description,
    parameter.summary,
    parameter.text,
  ];

  for (const candidate of candidates) {
    const stringValue = toStringValue(candidate);

    if (stringValue !== null) {
      return stringValue;
    }
  }

  if (Boolean(parameter.locked)) {
    return "Hidden until unlocked";
  }

  if (
    hasOwnProperty(parameter, "score") ||
    hasOwnProperty(parameter, "value") ||
    hasOwnProperty(parameter, "result")
  ) {
    return "Not available";
  }

  return null;
};

const flattenPrimitiveEntries = (
  value: Record<string, unknown>,
  parentKey = "",
): Array<{ key: string; value: string }> => {
  const entries: Array<{ key: string; value: string }> = [];

  Object.entries(value).forEach(([key, entryValue]) => {
    const normalizedKey = parentKey ? `${parentKey}.${key}` : key;

    if (EXCLUDED_KEYS.has(normalizedKey) || EXCLUDED_KEYS.has(key)) {
      return;
    }

    const primitiveValue = toStringValue(entryValue);

    if (primitiveValue !== null) {
      entries.push({
        key: normalizedKey,
        value: primitiveValue,
      });
      return;
    }

    const nestedValue = toObject(entryValue);

    if (nestedValue) {
      entries.push(...flattenPrimitiveEntries(nestedValue, normalizedKey));
    }
  });

  return entries;
};

const normalizeResultParameters = (raw: Record<string, unknown>) => {
  const parameterList = raw.parameters;

  if (Array.isArray(parameterList)) {
    const normalized = parameterList
      .map((parameter) => toObject(parameter))
      .filter((parameter): parameter is Record<string, unknown> => parameter !== null)
      .map((parameter, index) => {
        const key = toStringValue(parameter.key) ?? `parameter-${index + 1}`;
        const label = toStringValue(parameter.label) ?? humanizeKey(key);
        const value = resolveParameterDisplayValue(parameter);

        if (value === null) {
          return null;
        }

        return {
          key,
          label,
          value,
          locked: Boolean(parameter.locked),
        };
      })
      .filter(
        (
          parameter,
        ): parameter is {
          key: string;
          label: string;
          value: string;
          locked: boolean;
        } => parameter !== null,
      );

    if (normalized.length > 0) {
      return normalized;
    }
  }

  return flattenPrimitiveEntries(raw).map((entry) => ({
    key: entry.key,
    label: humanizeKey(entry.key),
    value: entry.value,
  }));
};

const resolveMatchType = (
  raw: Record<string, unknown>,
): StoredCompatibilityResult["matchType"] => {
  const hasValue = (value: unknown) => value !== null && value !== undefined;

  if (raw.is_private_match === true) {
    return "private";
  }

  return "public";
};

export const extractCompatibilityResults = (payload: unknown): CompatibilityResult[] => {
  if (Array.isArray(payload)) {
    return payload.filter((item) => typeof item === "object") as CompatibilityResult[];
  }

  const objectPayload = toObject(payload);

  if (!objectPayload) {
    return [];
  }

  const arrayKeys = ["results", "history", "matches", "items", "data"];

  for (const key of arrayKeys) {
    const candidate = objectPayload[key];

    if (Array.isArray(candidate)) {
      return candidate.filter((item) => typeof item === "object") as CompatibilityResult[];
    }
  }

  if (toObject(objectPayload.result)) {
    return [objectPayload.result as CompatibilityResult];
  }

  return [objectPayload as CompatibilityResult];
};

export const normalizeCompatibilityResults = (
  payload: unknown,
  personLookup: Record<string, string> = {},
): StoredCompatibilityResult[] =>
  extractCompatibilityResults(payload).map((result, index) => {
    const raw = (toObject(result) ?? {}) as Record<string, unknown>;
    const personIdValue =
      raw.matched_private_person ??
      raw.matched_user ??
      raw.matched_private_person_id ??
      raw.matched_user_id ??
      raw.private_person_id ??
      raw.person_id ??
      raw.target_profile_id ??
      raw.profile_id ??
      raw.id ??
      `result-${index + 1}`;
    const personId = String(personIdValue);
    const scoreValue =
      raw.overall_score ??
      raw.score ??
      raw.match_score ??
      raw.compatibility_score ??
      raw.total_score ??
      0;
    const score = typeof scoreValue === "number" ? scoreValue : Number(scoreValue) || 0;
    const personName =
      toStringValue(raw.matched_user_name) ??
      personLookup[personId] ??
      `Person ${index + 1}`;
    const summary =
      toStringValue(raw.summary) ??
      toStringValue(raw.description) ??
      toStringValue(raw.interpretation) ??
      undefined;
    const createdAt = toStringValue(raw.created_at) ?? undefined;
    const parameters = normalizeResultParameters(raw);

    return {
      id: `${personId}-${index}-${createdAt ?? "current"}`,
      personId,
      personName,
      matchType: resolveMatchType(raw),
      score,
      summary,
      createdAt,
      parameters,
      raw,
    };
  });
