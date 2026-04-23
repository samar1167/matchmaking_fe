"use client";

import { isAxiosError } from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  mapPrivatePersonToFormValues,
  PrivatePersonForm,
} from "@/components/private-persons/private-person-form";
import { PrivatePersonCard } from "@/components/private-persons/private-person-card";
import {
  CompatibilityScoreLine,
  CompatibilityScoreRing,
  isNumericCompatibilityValue,
} from "@/components/ui/compatibility-score";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { authService } from "@/services/authService";
import { compatibilityService } from "@/services/compatibilityService";
import { normalizeCompatibilityResults } from "@/services/compatibilityMapper";
import { privatePersonsService } from "@/services/privatePersonsService";
import { useAuthStore } from "@/store/authStore";
import { useResultsStore, type StoredCompatibilityResult } from "@/store/resultsStore";
import type { ApiErrorResponse } from "@/types/common";
import type { PlanParameters } from "@/types/plan";
import type {
  CreatePrivatePersonRequest,
  PrivatePerson,
} from "@/types/private-persons";

function PrivateUsersLogo() {
  return (
    <Link href="/" className="flex items-center gap-3 text-[#901214]">
      <span className="relative flex h-8 w-8 items-center justify-center">
        <span className="absolute left-1 top-1 h-5 w-5 rotate-45 rounded-tl-full rounded-tr-full border-2 border-[#901214]" />
        <span className="absolute right-1 top-1 h-5 w-5 -rotate-45 rounded-tl-full rounded-tr-full border-2 border-[#901214]" />
      </span>
      <span className="font-display text-3xl font-bold leading-none tracking-tight">
        Luster
      </span>
    </Link>
  );
}

function PrivateUsersLink({
  children,
  href,
  variant = "secondary",
}: {
  children: React.ReactNode;
  href: string;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link
      href={href}
      className={
        variant === "primary"
          ? "inline-flex min-h-11 items-center justify-center rounded-md bg-[#901214] px-5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(144,18,20,0.14)] transition hover:bg-[#961116]"
          : "inline-flex min-h-11 items-center justify-center rounded-md border border-[#C07771] bg-[#fafafa] px-5 text-sm font-bold text-[#901214] transition hover:border-[#901214]"
      }
    >
      {children}
    </Link>
  );
}

function PrivateUsersButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#C07771] bg-[#fafafa] px-5 text-sm font-bold text-[#901214] transition hover:border-[#901214] disabled:cursor-not-allowed disabled:opacity-60"
      disabled={disabled}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function PrivateUsersLogoutButton() {
  const router = useRouter();
  const clearSession = useAuthStore((state) => state.clearSession);
  const [isPending, setIsPending] = useState(false);

  const handleLogout = async () => {
    try {
      setIsPending(true);
      await authService.logout();
    } catch {
      clearSession();
    } finally {
      setIsPending(false);
      router.replace("/login");
    }
  };

  return (
    <PrivateUsersButton disabled={isPending} onClick={handleLogout}>
      {isPending ? "Signing out..." : "Log Out"}
    </PrivateUsersButton>
  );
}

function PrivateUsersSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#EABFB9] bg-[#fafafa] p-6 shadow-[0_14px_34px_rgba(144,18,20,0.06)]">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#A22E34]">
        {eyebrow}
      </p>
      <h2 className="mt-2 font-display text-3xl font-bold leading-tight text-[#2d1718]">
        {title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#2d1718]/70">
        {description}
      </p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function PrivateUsersEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-[#C07771] bg-[#fffafa] p-6 text-sm leading-6 text-[#2d1718]/65">
      {children}
    </div>
  );
}

function PrivateUsersAlert({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[#EABFB9] bg-[#fdf1f0] px-4 py-3 text-sm font-semibold text-[#901214]">
      {children}
    </div>
  );
}

const getServerMessage = (
  payload: ApiErrorResponse | string | string[] | Record<string, unknown> | undefined,
) => {
  if (!payload) {
    return null;
  }

  if (typeof payload === "string") {
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.find((value): value is string => typeof value === "string") || null;
  }

  if ("message" in payload && typeof payload.message === "string") {
    return payload.message;
  }

  if ("detail" in payload && typeof payload.detail === "string") {
    return payload.detail;
  }

  if ("error" in payload && typeof payload.error === "string") {
    return payload.error;
  }

  return null;
};

const extractActionErrorMessage = (error: unknown, fallback: string) => {
  if (isAxiosError<ApiErrorResponse | string | string[] | Record<string, unknown>>(error)) {
    return getServerMessage(error.response?.data) || fallback;
  }

  return fallback;
};

const isLockedParameter = (key: string, parameters: PlanParameters) => {
  const direct = parameters[key];

  if (direct && direct.paid && !direct.free) {
    return true;
  }

  const finalSegment = key.split(".").at(-1);

  if (!finalSegment) {
    return false;
  }

  const fallback = parameters[finalSegment];

  return Boolean(fallback?.paid && !fallback.free);
};

const shouldBlurParameter = (
  parameter: StoredCompatibilityResult["parameters"][number],
  parameters: PlanParameters,
) => {
  if (typeof parameter.locked === "boolean") {
    return parameter.locked;
  }

  return isLockedParameter(parameter.key, parameters);
};

function LockedParameterValue({ value }: { value: string }) {
  return (
    <div className="relative isolate overflow-hidden rounded-lg border border-[rgba(144,18,20,0.12)] bg-[linear-gradient(135deg,rgba(144,18,20,0.94)_0%,rgba(127,83,62,0.96)_100%)] px-3 py-3 text-white">
      <span className="block select-none blur-md opacity-80">{value}</span>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,13,10,0.08)_0%,rgba(12,13,10,0.62)_100%)]" />
      <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 rounded-lg border border-[rgba(245,213,200,0.28)] bg-[rgba(12,13,10,0.72)] px-3 py-2 text-center backdrop-blur-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[rgba(245,213,200,0.98)]">
          Locked Insight
        </p>
      </div>
    </div>
  );
}

function CompatibilityDetailsDialog({
  onClose,
  parameters,
  result,
}: {
  onClose: () => void;
  parameters: PlanParameters;
  result: StoredCompatibilityResult;
}) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-[#2d1718]/50 px-4 py-6"
      role="dialog"
    >
      <div className="max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-[#EABFB9] bg-[#fafafa] p-5 shadow-[0_24px_80px_rgba(45,23,24,0.28)]">
        <div className="flex flex-col gap-4 border-b border-[#EABFB9] pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <CompatibilityScoreRing score={result.score} size="sm" />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#A22E34]">
                Compatibility Detail
              </p>
              <h3 className="mt-2 font-display text-4xl font-bold leading-tight text-[#2d1718]">
                {result.personName}
              </h3>
            </div>
          </div>
          <button
            aria-label="Close compatibility details"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#C07771] bg-[#fafafa] text-xl font-bold text-[#901214] transition hover:border-[#901214]"
            type="button"
            onClick={onClose}
          >
            x
          </button>
        </div>

        {result.summary ? (
          <p className="mt-5 text-sm leading-6 text-[#2d1718]/70">{result.summary}</p>
        ) : null}

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {result.parameters.length > 0 ? (
            result.parameters.map((parameter) => {
              const locked = shouldBlurParameter(parameter, parameters);
              const numericValue = Number(parameter.value);
              const showScoreLine =
                !locked && isNumericCompatibilityValue(parameter.value);

              return (
                <div
                  className="rounded-lg border border-[#EABFB9] bg-[#fffafa] p-4"
                  key={`${result.id}-${parameter.key}`}
                >
                  {showScoreLine ? (
                    <CompatibilityScoreLine
                      label={parameter.label}
                      score={numericValue}
                    />
                  ) : (
                    <>
                      <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7F533E]">
                        {parameter.label}
                      </dt>
                      <dd className="mt-3 min-h-12 text-sm font-semibold leading-6 text-[#2d1718]">
                        {locked ? (
                          <LockedParameterValue value={parameter.value} />
                        ) : (
                          parameter.value
                        )}
                      </dd>
                    </>
                  )}
                </div>
              );
            })
          ) : (
            <div className="rounded-lg border border-dashed border-[#C07771] bg-[#fffafa] p-5 text-sm text-[#2d1718]/65 md:col-span-2">
              No compatibility parameters were returned for this user.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CompatibilityConfirmDialog({
  isSubmitting,
  onCancel,
  onConfirm,
  personName,
}: {
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  personName: string;
}) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-[#2d1718]/50 px-4 py-6"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-xl border border-[#EABFB9] bg-[#fafafa] p-6 shadow-[0_24px_80px_rgba(45,23,24,0.28)]">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#A22E34]">
          Confirm Compatibility
        </p>
        <h3 className="mt-3 font-display text-3xl font-bold text-[#2d1718]">
          {personName}
        </h3>
        <p className="mt-4 text-sm font-semibold leading-6 text-[#2d1718]/72">
          Checking Compatibility reqired 1 credit. Say yes to continue
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-[#C07771] bg-[#fafafa] px-5 text-sm font-bold text-[#901214] transition hover:border-[#901214]"
            disabled={isSubmitting}
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#901214] px-5 text-sm font-bold text-white transition hover:bg-[#961116] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="button"
            onClick={onConfirm}
          >
            {isSubmitting ? "Checking..." : "Yes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PrivatePersonsManager() {
  const setResults = useResultsStore((state) => state.setResults);
  const { parameters } = usePlanAccess();
  const [privatePersons, setPrivatePersons] = useState<PrivatePerson[]>([]);
  const [compatibilityScoresByPerson, setCompatibilityScoresByPerson] = useState<
    Record<string, StoredCompatibilityResult>
  >({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [checkingPersonId, setCheckingPersonId] = useState<number | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<PrivatePerson | null>(null);
  const [detailResult, setDetailResult] = useState<StoredCompatibilityResult | null>(
    null,
  );
  const [isCreatePending, setIsCreatePending] = useState(false);
  const [isEditPending, setIsEditPending] = useState(false);
  const [isDeletePending, setIsDeletePending] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    void loadPrivatePersons();
  }, []);

  const loadPrivatePersons = async () => {
    try {
      setLoading(true);
      setError(null);
      const [response, historyResponse] = await Promise.all([
        privatePersonsService.list(),
        compatibilityService.history().catch(() => ({ results: [] })),
      ]);
      setPrivatePersons(response.results);
      setCompatibilityScoresByPerson(
        buildCompatibilityScoresByPerson(historyResponse, response.results),
      );
    } catch {
      setError("Unable to load private persons right now.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (values: CreatePrivatePersonRequest) => {
    try {
      setIsCreatePending(true);
      setError(null);
      const response = await privatePersonsService.create(values);
      setPrivatePersons((current) => [response, ...current]);
      setShowCreateForm(false);
    } catch {
      setError("Unable to add this person right now.");
      throw new Error("Create failed.");
    } finally {
      setIsCreatePending(false);
    }
  };

  const handleUpdate = async (privatePersonId: number, values: CreatePrivatePersonRequest) => {
    try {
      setIsEditPending(true);
      setError(null);
      const response = await privatePersonsService.update(privatePersonId, values);
      setPrivatePersons((current) =>
        current.map((item) => (item.id === privatePersonId ? response : item)),
      );
      setEditingId(null);
    } catch {
      setError("Unable to update this person right now.");
      throw new Error("Update failed.");
    } finally {
      setIsEditPending(false);
    }
  };

  const handleDelete = async (privatePersonId: number) => {
    setDeleteTargetId(privatePersonId);
    try {
      setIsDeletePending(true);
      setError(null);
      await privatePersonsService.remove(privatePersonId);
      setPrivatePersons((current) => current.filter((item) => item.id !== privatePersonId));
      setCompatibilityScoresByPerson((currentScores) => {
        const nextScores = { ...currentScores };
        delete nextScores[String(privatePersonId)];
        return nextScores;
      });
      if (editingId === privatePersonId) {
        setEditingId(null);
      }
    } catch {
      setError("Unable to delete this person right now.");
    } finally {
      setDeleteTargetId(null);
      setIsDeletePending(false);
    }
  };

  const personLookup = useMemo(
    () =>
      privatePersons.reduce<Record<string, string>>((accumulator, person) => {
        accumulator[String(person.id)] = person.name;
        return accumulator;
      }, {}),
    [privatePersons],
  );

  const handleCompatibilityCheck = async (privatePerson: PrivatePerson) => {
    try {
      setCheckingPersonId(privatePerson.id);
      setError(null);

      const response = await compatibilityService.calculate({
        matched_private_person_id: privatePerson.id,
      });
      const normalizedResults = normalizeCompatibilityResults(response, {
        ...personLookup,
        [String(privatePerson.id)]: privatePerson.name,
      });

      setResults(normalizedResults);
      setCompatibilityScoresByPerson((currentScores) => {
        const nextScores = { ...currentScores };

        normalizedResults.forEach((result) => {
          const personId = result.personId || String(privatePerson.id);
          nextScores[personId] = {
            ...result,
            personName: result.personName || privatePerson.name,
          };
        });

        if (normalizedResults[0]) {
          nextScores[String(privatePerson.id)] = {
            ...normalizedResults[0],
            personId: String(privatePerson.id),
            personName: privatePerson.name,
          };
        }

        return nextScores;
      });
      setConfirmTarget(null);
    } catch (error) {
      setError(
        extractActionErrorMessage(error, "Compatibility check failed. Please try again."),
      );
    } finally {
      setCheckingPersonId(null);
    }
  };

  const selectedDetailResult = detailResult
    ? {
        ...detailResult,
        personName: personLookup[detailResult.personId] ?? detailResult.personName,
      }
    : null;

  return (
    <main className="min-h-screen bg-[#fffafa] text-[#2d1718]">
      <nav className="border-b border-[#EABFB9] bg-[#fafafa] px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6">
          <PrivateUsersLogo />
          <div className="hidden items-center gap-8 text-sm font-semibold text-[#2d1718]/72 lg:flex">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/connections">Connections</Link>
            <Link href="/compatibility">Compatibility Check</Link>
            <Link href="/results">Results</Link>
          </div>
          <div className="flex items-center gap-3">
            <PrivateUsersLink href="/compatibility" variant="primary">
              Run Check
            </PrivateUsersLink>
            <PrivateUsersLogoutButton />
          </div>
        </div>
      </nav>

      <section className="bg-[linear-gradient(180deg,#fffafa_0%,#fdf1f0_100%)] px-6 py-10">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="inline-flex rounded-full bg-[#EABFB9] px-4 py-2 text-sm font-bold text-[#901214]">
              private compatibility library
            </p>
            <h1 className="mt-5 max-w-3xl font-display text-6xl font-bold leading-[1.05] tracking-tight text-[#2d1718]">
              Private users ready for clear comparison.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#2d1718]/72">
              Maintain private birth profiles for future compatibility checks.
              Add, scan, edit, and keep every record easy to review.
            </p>
          </div>
          <div className="rounded-2xl border border-[#EABFB9] bg-[#fafafa] p-6 shadow-[0_18px_42px_rgba(144,18,20,0.1)]">
            <p className="text-sm font-bold text-[#901214]">Private User Snapshot</p>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-[#EABFB9] bg-[#fffafa] p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7F533E]">
                  Saved Profiles
                </p>
                <p className="mt-2 font-display text-5xl font-bold text-[#901214]">
                  {privatePersons.length}
                </p>
              </div>
              <button
                className="group rounded-xl border border-dashed border-[#C07771] bg-[#fdf1f0] p-5 text-left transition hover:border-[#901214] hover:bg-[#fafafa]"
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setShowCreateForm(true);
                }}
              >
                <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#7F533E]">
                  Add New
                </span>
                <span className="mt-2 block font-display text-5xl font-bold leading-none text-[#901214]">
                  +
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8">
        {error ? <PrivateUsersAlert>{error}</PrivateUsersAlert> : null}

        {showCreateForm ? (
          <PrivateUsersSection
            eyebrow="Add Private User"
            title="Create a private profile"
            description="Fill in birth details carefully. All fields are required for a complete compatibility record."
          >
            <PrivatePersonForm
              isSubmitting={isCreatePending}
              mode="create"
              onCancel={() => setShowCreateForm(false)}
              onSubmit={handleCreate}
            />
          </PrivateUsersSection>
        ) : null}

        <PrivateUsersSection
          eyebrow="Private Users"
          title="Saved private users"
          description={`${privatePersons.length} profile${
            privatePersons.length === 1 ? "" : "s"
          } available for compatibility checks.`}
        >
          {loading ? <PrivateUsersEmpty>Loading private users...</PrivateUsersEmpty> : null}

          {!loading && privatePersons.length === 0 && !showCreateForm ? (
            <PrivateUsersEmpty>
              No private users have been added yet. Use the plus card to create the first
              record.
            </PrivateUsersEmpty>
          ) : null}

          {!loading ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {privatePersons.map((privatePerson) =>
                editingId === privatePerson.id ? (
                  <article
                    key={privatePerson.id}
                    className="rounded-xl border border-[#EABFB9] bg-[#fafafa] p-5 shadow-[0_10px_24px_rgba(144,18,20,0.05)] md:col-span-2 xl:col-span-3"
                  >
                    <div className="mb-5">
                      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#A22E34]">
                        Edit Mode
                      </p>
                      <h3 className="mt-3 font-display text-3xl font-bold tracking-tight text-[#2d1718]">
                        Edit private user
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-[#2d1718]/70">
                        Update the birth details and save the changes.
                      </p>
                    </div>
                    <PrivatePersonForm
                      initialValues={mapPrivatePersonToFormValues(privatePerson)}
                      isSubmitting={isEditPending}
                      mode="edit"
                      onCancel={() => setEditingId(null)}
                      onSubmit={(values) => handleUpdate(privatePerson.id, values)}
                    />
                  </article>
                ) : (
                  <PrivatePersonCard
                    compatibilityResult={
                      compatibilityScoresByPerson[String(privatePerson.id)]
                    }
                    key={privatePerson.id}
                    isChecking={checkingPersonId === privatePerson.id}
                    isDeleting={isDeletePending && deleteTargetId === privatePerson.id}
                    onCheckCompatibility={() => setConfirmTarget(privatePerson)}
                    onDelete={() => handleDelete(privatePerson.id)}
                    onDetails={() => {
                      const result =
                        compatibilityScoresByPerson[String(privatePerson.id)];

                      if (result) {
                        setDetailResult(result);
                      }
                    }}
                    onEdit={() => {
                      setShowCreateForm(false);
                      setEditingId(privatePerson.id);
                    }}
                    privatePerson={privatePerson}
                  />
                ),
              )}
            </div>
          ) : null}
        </PrivateUsersSection>
      </div>

      {confirmTarget ? (
        <CompatibilityConfirmDialog
          isSubmitting={checkingPersonId === confirmTarget.id}
          onCancel={() => setConfirmTarget(null)}
          onConfirm={() => handleCompatibilityCheck(confirmTarget)}
          personName={confirmTarget.name}
        />
      ) : null}

      {selectedDetailResult ? (
        <CompatibilityDetailsDialog
          onClose={() => setDetailResult(null)}
          parameters={parameters}
          result={selectedDetailResult}
        />
      ) : null}
    </main>
  );
}

function buildCompatibilityScoresByPerson(
  payload: unknown,
  privatePersons: PrivatePerson[],
) {
  const lookup = privatePersons.reduce<Record<string, string>>((accumulator, person) => {
    accumulator[String(person.id)] = person.name;
    return accumulator;
  }, {});

  return normalizeCompatibilityResults(payload, lookup).reduce<
    Record<string, StoredCompatibilityResult>
  >((accumulator, result) => {
    accumulator[result.personId] = result;
    return accumulator;
  }, {});
}
