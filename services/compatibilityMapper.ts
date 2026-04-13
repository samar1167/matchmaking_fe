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
  "created_at",
  "updated_at",
  "person_id",
  "person_name",
  "private_person_id",
  "private_person_name",
  "profile_id",
  "target_profile_id",
  "name",
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
      raw.private_person_id ??
      raw.person_id ??
      raw.target_profile_id ??
      raw.profile_id ??
      raw.id ??
      `result-${index + 1}`;
    const personId = String(personIdValue);
    const scoreValue =
      raw.score ??
      raw.match_score ??
      raw.compatibility_score ??
      raw.total_score ??
      0;
    const score = typeof scoreValue === "number" ? scoreValue : Number(scoreValue) || 0;
    const personName =
      toStringValue(raw.private_person_name) ??
      toStringValue(raw.person_name) ??
      toStringValue(raw.name) ??
      personLookup[personId] ??
      `Person ${index + 1}`;
    const summary =
      toStringValue(raw.summary) ??
      toStringValue(raw.interpretation) ??
      toStringValue(raw.description) ??
      undefined;
    const createdAt = toStringValue(raw.created_at) ?? undefined;
    const parameters = flattenPrimitiveEntries(raw).map((entry) => ({
      key: entry.key,
      label: humanizeKey(entry.key),
      value: entry.value,
    }));

    return {
      id: `${personId}-${index}-${createdAt ?? "current"}`,
      personId,
      personName,
      score,
      summary,
      createdAt,
      parameters,
      raw,
    };
  });
