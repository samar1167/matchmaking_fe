"use client";

import { isAxiosError } from "axios";
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
import type { ApiErrorResponse } from "@/types/common";
import type {
  CreateProfileRequest,
  ProfileResponse,
  UpdateProfileRequest,
  UserProfile,
} from "@/types/profile";

interface ProfileFormValues {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  time_of_birth: string;
  place_of_birth: string;
  latitude: string;
  longitude: string;
  timezone: string;
}

type ValidationErrors = Partial<Record<keyof ProfileFormValues, string>>;

const emptyValues: ProfileFormValues = {
  first_name: "",
  last_name: "",
  date_of_birth: "",
  time_of_birth: "",
  place_of_birth: "",
  latitude: "",
  longitude: "",
  timezone: "",
};

const mapProfileToFormValues = (profile: UserProfile): ProfileFormValues => ({
  first_name: profile.first_name ?? profile.user?.first_name ?? "",
  last_name: profile.last_name ?? profile.user?.last_name ?? "",
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
  profilePicture: File | null,
  removeProfilePicture: boolean,
): CreateProfileRequest | UpdateProfileRequest => ({
  first_name: values.first_name.trim() || undefined,
  last_name: values.last_name.trim() || undefined,
  profile_picture: profilePicture,
  remove_profile_picture: removeProfilePicture || undefined,
  date_of_birth: values.date_of_birth,
  time_of_birth: values.time_of_birth,
  place_of_birth: values.place_of_birth.trim(),
  latitude: values.latitude ? Number(values.latitude) : null,
  longitude: values.longitude ? Number(values.longitude) : null,
  timezone: values.timezone.trim() || undefined,
});

export function ProfileManager() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [values, setValues] = useState<ProfileFormValues>(emptyValues);
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [profilePicturePreviewUrl, setProfilePicturePreviewUrl] = useState<string | null>(null);
  const [removeProfilePicture, setRemoveProfilePicture] = useState(false);
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
        setProfilePictureFile(null);
        setProfilePicturePreviewUrl(existingProfile?.profile_picture ?? null);
        setRemoveProfilePicture(false);
        if (existingProfile?.user) {
          setUser(existingProfile.user);
        }
    } catch {
      setError("Unable to load your profile right now.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [setUser]);

  const submitLabel = useMemo(() => {
    if (profile) {
      return isSaving ? "Saving..." : "Save profile";
    }

    return isSaving ? "Creating..." : "Create profile";
  }, [isSaving, profile]);

  const accountLabel = user?.email || user?.username || "Unknown";
  const displayName =
    [values.first_name.trim(), values.last_name.trim()].filter(Boolean).join(" ") || "Not set";
  const locationPrecision =
    values.latitude && values.longitude ? "Coordinates added" : "Coordinates pending";
  const activeProfilePicture = removeProfilePicture ? null : profilePicturePreviewUrl;

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
    setProfilePictureFile(null);
    setProfilePicturePreviewUrl(profile?.profile_picture ?? null);
    setRemoveProfilePicture(false);
    setErrors({});
    setSuccessMessage(null);
    setError(null);
  };

  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Profile picture must be an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Profile picture must be 5MB or smaller.");
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);

    if (profilePicturePreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(profilePicturePreviewUrl);
    }

    setProfilePictureFile(file);
    setProfilePicturePreviewUrl(nextPreviewUrl);
    setRemoveProfilePicture(false);
    setError(null);
    setSuccessMessage(null);
  };

  const handleRemoveProfilePicture = () => {
    if (profilePicturePreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(profilePicturePreviewUrl);
    }

    setProfilePictureFile(null);
    setProfilePicturePreviewUrl(null);
    setRemoveProfilePicture(true);
    setSuccessMessage(null);
    setError(null);
  };

  useEffect(() => {
    return () => {
      if (profilePicturePreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(profilePicturePreviewUrl);
      }
    };
  }, [profilePicturePreviewUrl]);

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

      const payload = buildProfilePayload(values, profilePictureFile, removeProfilePicture);
      const savedProfile: ProfileResponse = profile
        ? await profileService.updateMe(payload)
        : await profileService.createMe(payload);

      setProfile(savedProfile);
      setValues(mapProfileToFormValues(savedProfile));
      setProfilePictureFile(null);
      setProfilePicturePreviewUrl(savedProfile.profile_picture ?? null);
      setRemoveProfilePicture(false);
      if (savedProfile.user) {
        setUser(savedProfile.user);
      }
      setSuccessMessage(profile ? "Profile updated." : "Profile created.");
    } catch (error) {
      if (isAxiosError<ApiErrorResponse | Record<string, string[]>>(error)) {
        const data = error.response?.data;

        if (data && typeof data === "object") {
          if ("message" in data && typeof data.message === "string") {
            setError(data.message);
            return;
          }

          const fieldErrors = Object.values(data)
            .flatMap((value) => (Array.isArray(value) ? value : []))
            .filter((value): value is string => typeof value === "string");

          if (fieldErrors.length > 0) {
            setError(fieldErrors[0]);
            return;
          }
        }
      }

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
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="grid gap-5 md:grid-cols-2">
                  <Input
                    label="First Name"
                    placeholder="Aarav"
                    value={values.first_name}
                    onChange={(event) => handleChange("first_name", event.target.value)}
                  />
                  <Input
                    label="Last Name"
                    placeholder="Sharma"
                    value={values.last_name}
                    onChange={(event) => handleChange("last_name", event.target.value)}
                  />
                </div>

                <div className={`${designSystem.inset} flex flex-col items-center gap-4 p-5`}>
                  <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-[1.75rem] border border-[rgba(49,36,87,0.12)] bg-white/80">
                    {activeProfilePicture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt="Profile preview"
                        className="h-full w-full object-cover"
                        src={activeProfilePicture}
                      />
                    ) : (
                      <span className="text-center text-xs font-semibold uppercase tracking-[0.24em] text-foreground/40">
                        No Picture
                      </span>
                    )}
                  </div>
                  <div className="w-full space-y-3">
                    <label className="block">
                      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-foreground/45">
                        Profile Picture
                      </span>
                      <input
                        accept="image/*"
                        className="block w-full text-sm text-foreground/72 file:mr-4 file:rounded-full file:border-0 file:bg-[rgba(49,36,87,0.08)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-[rgba(49,36,87,0.12)]"
                        type="file"
                        onChange={handleProfilePictureChange}
                      />
                    </label>
                    <Button
                      className="w-full"
                      disabled={!activeProfilePicture || isSaving}
                      type="button"
                      variant="secondary"
                      onClick={handleRemoveProfilePicture}
                    >
                      Remove picture
                    </Button>
                  </div>
                </div>
              </div>

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
              <MetricTile label="Name" value={displayName} className="min-h-[140px]" />
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
                <p className="text-sm font-medium text-primary">Name and picture</p>
                <BodyText className="mt-2">
                  Add your first name, last name, and a clear photo so your saved profile is easier
                  to identify later.
                </BodyText>
              </InfoTile>
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
