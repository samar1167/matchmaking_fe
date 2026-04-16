"use client";

import { isAxiosError } from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppScaffold } from "@/components/layout/app-scaffold";
import { Button } from "@/components/ui/button";
import {
  AlertMessage,
  EmptyState,
  SelectCard,
  SelectionPanel,
  designSystem,
} from "@/components/ui/design-system";
import { SectionCard } from "@/components/ui/section-card";
import { compatibilityService } from "@/services/compatibilityService";
import { normalizeCompatibilityResults } from "@/services/compatibilityMapper";
import { privatePersonsService } from "@/services/privatePersonsService";
import { profileService } from "@/services/profileService";
import { useResultsStore } from "@/store/resultsStore";
import type { ApiErrorResponse } from "@/types/common";
import type { PrivatePerson } from "@/types/private-persons";
import type { UserProfile } from "@/types/profile";

export function CompatibilityManager() {
  const router = useRouter();
  const setResults = useResultsStore((state) => state.setResults);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [privatePersons, setPrivatePersons] = useState<PrivatePerson[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [profileResponse, privatePersonResponse] = await Promise.all([
          profileService.getMe(),
          privatePersonsService.list(),
        ]);

        setProfiles(profileResponse.results);
        setPrivatePersons(privatePersonResponse.results);

        if (profileResponse.results[0]?.id) {
          setSelectedProfileId(String(profileResponse.results[0].id));
        }
      } catch {
        setError("Unable to load profiles and private persons right now.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const personLookup = useMemo(
    () =>
      privatePersons.reduce<Record<string, string>>((accumulator, person) => {
        accumulator[String(person.id)] = person.name;
        return accumulator;
      }, {}),
    [privatePersons],
  );

  const togglePerson = (personId: string) => {
    setSelectedPersonIds((current) =>
      current.includes(personId)
        ? current.filter((value) => value !== personId)
        : [...current, personId],
    );
  };

  const getProfileDisplayName = (profile: UserProfile) => {
    const firstName = profile.first_name ?? profile.user?.first_name ?? "";
    const lastName = profile.last_name ?? profile.user?.last_name ?? "";
    const fullName = `${firstName} ${lastName}`.trim();

    return fullName || profile.user?.username || `Profile #${profile.id}`;
  };

  const getCompatibilityErrorMessage = (error: unknown) => {
    if (isAxiosError<ApiErrorResponse | string | string[] | Record<string, string[]>>(error)) {
      const data = error.response?.data;

      if (typeof data === "string") {
        return data;
      }

      if (Array.isArray(data)) {
        const message = data.find((value): value is string => typeof value === "string");

        if (message) {
          return message;
        }
      }

      if (data && typeof data === "object") {
        if ("error" in data && typeof data.error === "string") {
          return data.error;
        }

        if ("message" in data && typeof data.message === "string") {
          return data.message;
        }

        if ("detail" in data && typeof data.detail === "string") {
          return data.detail;
        }

        if ("details" in data && data.details && typeof data.details === "object") {
          const detailError = Object.values(data.details)
            .flatMap((value) => (Array.isArray(value) ? value : []))
            .find((value): value is string => typeof value === "string");

          if (detailError) {
            return detailError;
          }
        }

        const fieldErrors = Object.entries(data)
          .flatMap(([, value]) => (Array.isArray(value) ? value : []))
          .filter((value): value is string => typeof value === "string");

        if (fieldErrors.length > 0) {
          return fieldErrors[0];
        }
      }
    }

    return "Compatibility check failed. Please try again.";
  };

  const runCompatibilityCheck = async () => {
    if (!selectedProfileId) {
      setError("Select your profile before running compatibility.");
      return;
    }

    if (selectedPersonIds.length === 0) {
      setError("Select at least one private person.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const responses = await Promise.all(
        selectedPersonIds.map((privatePersonId) =>
          compatibilityService.calculate({
            matched_private_person_id: privatePersonId,
          }),
        ),
      );

      const normalizedResults = responses.flatMap((response) =>
        normalizeCompatibilityResults(response, personLookup),
      );

      setResults(normalizedResults);
      router.push("/results");
    } catch (error) {
      setError(getCompatibilityErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppScaffold
      title="Compatibility"
      description="Select your birth profile and one or more private persons to run compatibility checks. Results are stored locally and presented with premium visual hierarchy on the results page."
    >
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <SectionCard
          eyebrow="Compatibility Run"
          title="Create a compatibility run"
          description="Choose the profile you want to compare, then select one or more saved private persons."
        >
          {isLoading ? (
            <EmptyState>
              Loading available profiles and private persons...
            </EmptyState>
          ) : (
            <div className="space-y-8">
              <div>
                <p className="text-sm font-medium text-foreground">Own profile</p>
                <div className="mt-3 grid gap-3">
                  {profiles.length > 0 ? (
                    profiles.map((profile) => {
                      const isSelected = selectedProfileId === String(profile.id);

                      return (
                        <SelectCard
                          active={isSelected}
                          key={profile.id}
                          type="button"
                          onClick={() => setSelectedProfileId(String(profile.id))}
                        >
                          <div
                            className={`absolute inset-y-0 left-0 w-1 rounded-r-full bg-[linear-gradient(180deg,#d2a74b_0%,#7f68cc_100%)] transition ${
                              isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                            }`}
                          />
                          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-accent">
                            Own Profile
                          </p>
                          <p className="mt-3 font-display text-3xl font-semibold text-primary">
                            {getProfileDisplayName(profile)}
                          </p>
                          <p className="mt-3 text-sm text-foreground/65">
                            {profile.date_of_birth} at {profile.time_of_birth}
                          </p>
                          <p className="mt-1 text-sm text-foreground/55">
                            {profile.place_of_birth}
                          </p>
                        </SelectCard>
                      );
                    })
                  ) : (
                    <EmptyState className="p-5">
                      No profile is available yet. Create one before running checks.
                    </EmptyState>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Private persons</p>
                  <p className="text-sm text-foreground/55">
                    {selectedPersonIds.length} selected
                  </p>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {privatePersons.length > 0 ? (
                    privatePersons.map((person) => {
                      const checked = selectedPersonIds.includes(String(person.id));

                      return (
                        <SelectionPanel
                          active={checked}
                          key={person.id}
                        >
                          <input
                            checked={checked}
                            type="checkbox"
                            onChange={() => togglePerson(String(person.id))}
                            className="mt-1 h-4 w-4 rounded border-black/20 text-accent focus:ring-accent"
                          />
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-accent">
                              Selected Match
                            </p>
                            <p className="mt-3 font-display text-3xl font-semibold text-primary">
                              {person.name}
                            </p>
                            <p className="mt-3 text-sm text-foreground/65">
                              {person.date_of_birth}
                              {person.time_of_birth ? ` at ${person.time_of_birth}` : ""}
                            </p>
                            {person.place_of_birth ? (
                              <p className="mt-1 text-sm text-foreground/55">
                                {person.place_of_birth}
                              </p>
                            ) : null}
                          </div>
                        </SelectionPanel>
                      );
                    })
                  ) : (
                    <EmptyState className="p-5">
                      No private persons are available yet. Add one first.
                    </EmptyState>
                  )}
                </div>
              </div>

              {error ? <AlertMessage>{error}</AlertMessage> : null}

              <div className="flex flex-wrap gap-3">
                <Button disabled={isSubmitting || isLoading} onClick={runCompatibilityCheck}>
                  {isSubmitting ? "Running checks..." : "Run compatibility"}
                </Button>
                <Button onClick={() => router.push("/results")} variant="secondary">
                  View stored results
                </Button>
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard
          eyebrow="Refinement"
          title="Guidance"
          description="A few quick reminders before you start a comparison."
        >
          <div className={`${designSystem.inset} space-y-4 p-5 text-sm leading-7 text-foreground/70`}>
            <p>Use the most complete birth details available for cleaner compatibility signals.</p>
            <p>Select multiple private persons to run a batch comparison in one action.</p>
            <p>
              Paid parameters are hidden later in results until they are unlocked by your
              current plan.
            </p>
            <p>
              Need to review past output? Open{" "}
              <Link className="font-medium text-accent" href="/results">
                results
              </Link>
              .
            </p>
          </div>
        </SectionCard>
      </div>
    </AppScaffold>
  );
}
