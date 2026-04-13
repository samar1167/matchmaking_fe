"use client";

import { useEffect, useMemo, useState } from "react";
import { AppScaffold } from "@/components/layout/app-scaffold";
import { Button } from "@/components/ui/button";
import {
  AlertMessage,
  BodyText,
  EmptyState,
  InfoTile,
  MetricTile,
  designSystem,
} from "@/components/ui/design-system";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/section-card";
import { profileService } from "@/services/profileService";
import { useAuthStore } from "@/store/authStore";
import type {
  CreateProfileRequest,
  ProfileResponse,
  UpdateProfileRequest,
  UserProfile,
} from "@/types/profile";

interface ProfileFormValues {
  date_of_birth: string;
  time_of_birth: string;
  place_of_birth: string;
  latitude: string;
  longitude: string;
  timezone: string;
}

type ValidationErrors = Partial<Record<keyof ProfileFormValues, string>>;

const emptyValues: ProfileFormValues = {
  date_of_birth: "",
  time_of_birth: "",
  place_of_birth: "",
  latitude: "",
  longitude: "",
  timezone: "",
};

const mapProfileToFormValues = (profile: UserProfile): ProfileFormValues => ({
  date_of_birth: profile.date_of_birth ?? "",
  time_of_birth: profile.time_of_birth ?? "",
  place_of_birth: profile.place_of_birth ?? "",
  latitude:
    typeof profile.latitude === "number" && Number.isFinite(profile.latitude)
      ? String(profile.latitude)
      : "",
  longitude:
    typeof profile.longitude === "number" && Number.isFinite(profile.longitude)
      ? String(profile.longitude)
      : "",
  timezone: profile.timezone ?? "",
});

const validateProfileForm = (values: ProfileFormValues): ValidationErrors => {
  const errors: ValidationErrors = {};
  const today = new Date().toISOString().split("T")[0];

  if (!values.date_of_birth) {
    errors.date_of_birth = "Date of birth is required.";
  } else if (values.date_of_birth > today) {
    errors.date_of_birth = "Date of birth cannot be in the future.";
  }

  if (!values.time_of_birth) {
    errors.time_of_birth = "Time of birth is required.";
  }

  if (!values.place_of_birth.trim()) {
    errors.place_of_birth = "Place of birth is required.";
  }

  if (values.latitude && Number.isNaN(Number(values.latitude))) {
    errors.latitude = "Latitude must be a valid number.";
  }

  if (values.longitude && Number.isNaN(Number(values.longitude))) {
    errors.longitude = "Longitude must be a valid number.";
  }

  return errors;
};

const buildProfilePayload = (
  values: ProfileFormValues,
): CreateProfileRequest | UpdateProfileRequest => ({
  date_of_birth: values.date_of_birth,
  time_of_birth: values.time_of_birth,
  place_of_birth: values.place_of_birth.trim(),
  latitude: values.latitude ? Number(values.latitude) : null,
  longitude: values.longitude ? Number(values.longitude) : null,
  timezone: values.timezone.trim() || undefined,
});

export function ProfileManager() {
  const user = useAuthStore((state) => state.user);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [values, setValues] = useState<ProfileFormValues>(emptyValues);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await profileService.getMe();
        const existingProfile = response.results[0] ?? null;

        setProfile(existingProfile);
        setValues(existingProfile ? mapProfileToFormValues(existingProfile) : emptyValues);
      } catch {
        setError("Unable to load your profile right now.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const submitLabel = useMemo(() => {
    if (profile) {
      return isSaving ? "Saving..." : "Save profile";
    }

    return isSaving ? "Creating..." : "Create profile";
  }, [isSaving, profile]);

  const accountLabel = user?.email || user?.username || "Unknown";
  const locationPrecision =
    values.latitude && values.longitude ? "Coordinates added" : "Coordinates pending";

  const handleChange = (field: keyof ProfileFormValues, value: string) => {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }));

    setSuccessMessage(null);
  };

  const handleReset = () => {
    setValues(profile ? mapProfileToFormValues(profile) : emptyValues);
    setErrors({});
    setSuccessMessage(null);
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateProfileForm(values);
    setErrors(nextErrors);
    setSuccessMessage(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const payload = buildProfilePayload(values);
      const savedProfile: ProfileResponse = profile
        ? await profileService.updateMe(payload)
        : await profileService.createMe(payload);

      setProfile(savedProfile);
      setValues(mapProfileToFormValues(savedProfile));
      setSuccessMessage(profile ? "Profile updated." : "Profile created.");
    } catch {
      setError("Unable to save your profile right now.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppScaffold
      title="Profile"
      description="Create and maintain your own birth profile so compatibility runs always use the most accurate source data."
    >
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <SectionCard
          eyebrow="Birth Data"
          title={profile ? "Update your profile" : "Create your profile"}
          description="These fields power your saved identity for compatibility checks and future profile-driven flows."
        >
          {isLoading ? (
            <EmptyState>Loading your saved profile...</EmptyState>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid gap-5 md:grid-cols-2">
                <Input
                  error={errors.date_of_birth}
                  label="Date of Birth"
                  type="date"
                  value={values.date_of_birth}
                  onChange={(event) => handleChange("date_of_birth", event.target.value)}
                />
                <Input
                  error={errors.time_of_birth}
                  label="Time of Birth"
                  type="time"
                  value={values.time_of_birth}
                  onChange={(event) => handleChange("time_of_birth", event.target.value)}
                />
              </div>

              <Input
                error={errors.place_of_birth}
                label="Place of Birth"
                placeholder="City, region, country"
                value={values.place_of_birth}
                onChange={(event) => handleChange("place_of_birth", event.target.value)}
              />

              <div className="grid gap-5 md:grid-cols-2">
                <Input
                  error={errors.latitude}
                  inputMode="decimal"
                  label="Latitude"
                  placeholder="12.9716"
                  value={values.latitude}
                  onChange={(event) => handleChange("latitude", event.target.value)}
                />
                <Input
                  error={errors.longitude}
                  inputMode="decimal"
                  label="Longitude"
                  placeholder="77.5946"
                  value={values.longitude}
                  onChange={(event) => handleChange("longitude", event.target.value)}
                />
              </div>

              <Input
                label="Timezone"
                placeholder="Asia/Kolkata"
                value={values.timezone}
                onChange={(event) => handleChange("timezone", event.target.value)}
              />

              {error ? <AlertMessage>{error}</AlertMessage> : null}
              {successMessage ? (
                <AlertMessage className="border-[#bcdcc8] bg-[#eefbf1] text-[#1e6b39]">
                  {successMessage}
                </AlertMessage>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <Button disabled={isSaving} type="submit">
                  {submitLabel}
                </Button>
                <Button
                  disabled={isSaving}
                  type="button"
                  variant="secondary"
                  onClick={handleReset}
                >
                  Reset fields
                </Button>
              </div>
            </form>
          )}
        </SectionCard>

        <div className="space-y-8">
          <SectionCard
            eyebrow="Account"
            title="Profile status"
            description="A compact view of what is currently connected to your account."
          >
            <div className="grid gap-4">
              <MetricTile label="Account" value={accountLabel} className="min-h-[140px]" />
              <MetricTile
                label="Profile Mode"
                value={profile ? "Saved" : "Missing"}
                className="min-h-[140px]"
              />
              <MetricTile
                label="Location Precision"
                value={locationPrecision}
                className="min-h-[140px]"
              />
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Notes"
            title="What to include"
            description="A few profile details matter more than the rest."
          >
            <div className={`${designSystem.inset} space-y-4 p-5`}>
              <InfoTile>
                <p className="text-sm font-medium text-primary">Birth date and time</p>
                <BodyText className="mt-2">
                  Use the most exact values you have available. These are required.
                </BodyText>
              </InfoTile>
              <InfoTile>
                <p className="text-sm font-medium text-primary">Birth place</p>
                <BodyText className="mt-2">
                  City, state or region, and country give the backend better location context.
                </BodyText>
              </InfoTile>
              <InfoTile>
                <p className="text-sm font-medium text-primary">Coordinates and timezone</p>
                <BodyText className="mt-2">
                  These fields are optional, but they help when precise location data is known.
                </BodyText>
              </InfoTile>
            </div>
          </SectionCard>
        </div>
      </div>
    </AppScaffold>
  );
}
