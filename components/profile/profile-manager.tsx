"use client";

import { isAxiosError } from "axios";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppScaffold } from "@/components/layout/app-scaffold";
import { Button } from "@/components/ui/button";
import {
  AlertMessage,
  BodyText,
  EmptyState,
  designSystem,
} from "@/components/ui/design-system";
import { GooglePlaceInput } from "@/components/ui/google-place-input";
import { Input, SelectInput } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/section-card";
import { authService } from "@/services/authService";
import { matchPreferencesService } from "@/services/matchPreferencesService";
import { profileService } from "@/services/profileService";
import { useAuthStore } from "@/store/authStore";
import type { ApiErrorResponse } from "@/types/common";
import type {
  SaveMatchPreferenceRequest,
  UserMatchPreference,
} from "@/types/match-preferences";
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

interface ChangePasswordValues {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

interface MatchPreferenceFormValues {
  preferred_gender: string;
  preferred_age_min: string;
  preferred_age_max: string;
  preferred_distance_km: string;
  preferred_relationship_intent: string;
  preferred_marital_status: string;
  modern_methods: string;
  karmic_glue: string;
  ancient_methods: string;
  deal_maker: string;
  sizzle: string;
}

type MatchPreferenceValidationErrors = Partial<Record<keyof MatchPreferenceFormValues, string>>;

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

const emptyChangePasswordValues: ChangePasswordValues = {
  old_password: "",
  new_password: "",
  confirm_password: "",
};

const emptyMatchPreferenceValues: MatchPreferenceFormValues = {
  preferred_gender: "",
  preferred_age_min: "",
  preferred_age_max: "",
  preferred_distance_km: "",
  preferred_relationship_intent: "",
  preferred_marital_status: "",
  modern_methods: "",
  karmic_glue: "",
  ancient_methods: "",
  deal_maker: "",
  sizzle: "",
};

const genderChoices = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non_binary", label: "Non-binary" },
  { value: "other", label: "Other" },
  { value: "any", label: "Any" },
];

const relationshipIntentChoices = [
  { value: "marriage", label: "Marriage" },
  { value: "long_term", label: "Long-term relationship" },
  { value: "casual", label: "Casual dating" },
  { value: "friendship", label: "Friendship" },
  { value: "open_to_explore", label: "Open to explore" },
];

const maritalStatusChoices = [
  { value: "never_married", label: "Never married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
  { value: "separated", label: "Separated" },
  { value: "annulled", label: "Annulled" },
  { value: "any", label: "Any" },
];

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

const numberToFormValue = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) ? String(value) : "";

const mapMatchPreferenceToFormValues = (
  preference: UserMatchPreference | null,
): MatchPreferenceFormValues => ({
  preferred_gender: preference?.preferred_gender ?? "",
  preferred_age_min: numberToFormValue(preference?.preferred_age_min),
  preferred_age_max: numberToFormValue(preference?.preferred_age_max),
  preferred_distance_km: numberToFormValue(preference?.preferred_distance_km),
  preferred_relationship_intent: preference?.preferred_relationship_intent ?? "",
  preferred_marital_status: preference?.preferred_marital_status ?? "",
  modern_methods: numberToFormValue(preference?.modern_methods),
  karmic_glue: numberToFormValue(preference?.karmic_glue),
  ancient_methods: numberToFormValue(preference?.ancient_methods),
  deal_maker: numberToFormValue(preference?.deal_maker),
  sizzle: numberToFormValue(preference?.sizzle),
});

const validateProfileForm = (values: ProfileFormValues): ValidationErrors => {
  const errors: ValidationErrors = {};
  const today = new Date().toISOString().split("T")[0];

  if (values.date_of_birth && values.date_of_birth > today) {
    errors.date_of_birth = "Date of birth cannot be in the future.";
  }

  if (values.latitude && Number.isNaN(Number(values.latitude))) {
    errors.latitude = "Latitude must be a valid number.";
  }

  if (values.longitude && Number.isNaN(Number(values.longitude))) {
    errors.longitude = "Longitude must be a valid number.";
  }

  return errors;
};

const validateMatchPreferenceForm = (
  values: MatchPreferenceFormValues,
): MatchPreferenceValidationErrors => {
  const errors: MatchPreferenceValidationErrors = {};
  const numericFields: Array<keyof MatchPreferenceFormValues> = [
    "preferred_age_min",
    "preferred_age_max",
    "preferred_distance_km",
    "modern_methods",
    "karmic_glue",
    "ancient_methods",
    "deal_maker",
    "sizzle",
  ];

  numericFields.forEach((field) => {
    if (values[field] && Number.isNaN(Number(values[field]))) {
      errors[field] = "Enter a valid number.";
    }
  });

  const ageMin = values.preferred_age_min ? Number(values.preferred_age_min) : null;
  const ageMax = values.preferred_age_max ? Number(values.preferred_age_max) : null;

  if (ageMin !== null && ageMin < 0) {
    errors.preferred_age_min = "Minimum age cannot be negative.";
  }

  if (ageMax !== null && ageMax < 0) {
    errors.preferred_age_max = "Maximum age cannot be negative.";
  }

  if (ageMin !== null && ageMax !== null && ageMin > ageMax) {
    errors.preferred_age_max = "Maximum age must be greater than or equal to minimum age.";
  }

  if (values.preferred_distance_km && Number(values.preferred_distance_km) < 0) {
    errors.preferred_distance_km = "Distance cannot be negative.";
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
  profile_picture: profilePicture || undefined,
  remove_profile_picture: removeProfilePicture || undefined,
  date_of_birth: values.date_of_birth || undefined,
  time_of_birth: values.time_of_birth || undefined,
  place_of_birth: values.place_of_birth.trim() || undefined,
  latitude: values.latitude ? Number(values.latitude) : undefined,
  longitude: values.longitude ? Number(values.longitude) : undefined,
  timezone: values.timezone.trim() || undefined,
});

const optionalText = (value: string) => {
  const trimmed = value.trim();
  return trimmed || undefined;
};

const optionalNumber = (value: string) => (value ? Number(value) : undefined);

const buildMatchPreferencePayload = (
  values: MatchPreferenceFormValues,
): SaveMatchPreferenceRequest => ({
  preferred_gender: optionalText(values.preferred_gender),
  preferred_age_min: optionalNumber(values.preferred_age_min),
  preferred_age_max: optionalNumber(values.preferred_age_max),
  preferred_distance_km: optionalNumber(values.preferred_distance_km),
  preferred_relationship_intent: optionalText(values.preferred_relationship_intent),
  preferred_marital_status: optionalText(values.preferred_marital_status),
  modern_methods: optionalNumber(values.modern_methods),
  karmic_glue: optionalNumber(values.karmic_glue),
  ancient_methods: optionalNumber(values.ancient_methods),
  deal_maker: optionalNumber(values.deal_maker),
  sizzle: optionalNumber(values.sizzle),
});

const formatServerErrorValue = (value: unknown): string | null => {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    const messages = value
      .map((item) => formatServerErrorValue(item))
      .filter((item): item is string => Boolean(item));

    return messages.length > 0 ? messages.join("\n") : null;
  }

  if (value && typeof value === "object") {
    const messages = Object.entries(value)
      .map(([key, nestedValue]) => {
        const message = formatServerErrorValue(nestedValue);
        return message ? `${key}: ${message}` : null;
      })
      .filter((item): item is string => Boolean(item));

    return messages.length > 0 ? messages.join("\n") : JSON.stringify(value, null, 2);
  }

  return null;
};

const extractApiErrorMessage = (error: unknown, fallback: string) => {
  if (isAxiosError<ApiErrorResponse | string | string[] | Record<string, unknown>>(error)) {
    const data = error.response?.data;

    if (typeof data === "string") {
      return data;
    }

    if (Array.isArray(data)) {
      return formatServerErrorValue(data) || fallback;
    }

    if (data && typeof data === "object") {
      if ("message" in data && typeof data.message === "string") {
        return data.message;
      }

      if ("error" in data && typeof data.error === "string") {
        return data.error;
      }

      return formatServerErrorValue(data) || fallback;
    }
  }

  return fallback;
};

const extractActionMessage = (
  response: { detail?: string; message?: string; meta?: { message?: string } } | undefined,
  fallback: string,
) => response?.detail || response?.message || response?.meta?.message || fallback;

const displayValue = (value: string | null | undefined) => {
  const normalized = value?.trim();
  return normalized ? normalized : "Not set";
};

const displayChoiceValue = (
  value: string | null | undefined,
  choices: Array<{ label: string; value: string }>,
) => {
  const normalized = value?.trim();
  return choices.find((choice) => choice.value === normalized)?.label ?? displayValue(value);
};

const formatUtcOffsetTimezone = (offsetMinutes: number | undefined) => {
  if (typeof offsetMinutes !== "number" || !Number.isFinite(offsetMinutes)) {
    return undefined;
  }

  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteOffset / 60).toString().padStart(2, "0");
  const minutes = (absoluteOffset % 60).toString().padStart(2, "0");

  return `UTC${sign}${hours}:${minutes}`;
};

const displayNumberValue = (value: string | number | null | undefined) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "Not set";
  }

  return displayValue(value);
};

const formatJsonBlock = (value: Record<string, unknown> | undefined) => {
  if (!value || Object.keys(value).length === 0) {
    return "Not returned yet";
  }

  return JSON.stringify(value, null, 2);
};

export function ProfileManager() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
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
  const [changePasswordValues, setChangePasswordValues] = useState<ChangePasswordValues>(
    emptyChangePasswordValues,
  );
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [matchPreference, setMatchPreference] = useState<UserMatchPreference | null>(null);
  const [matchPreferenceValues, setMatchPreferenceValues] =
    useState<MatchPreferenceFormValues>(emptyMatchPreferenceValues);
  const [matchPreferenceErrors, setMatchPreferenceErrors] =
    useState<MatchPreferenceValidationErrors>({});
  const [matchPreferenceError, setMatchPreferenceError] = useState<string | null>(null);
  const [matchPreferenceMessage, setMatchPreferenceMessage] = useState<string | null>(null);
  const [isLoadingMatchPreference, setIsLoadingMatchPreference] = useState(false);
  const [isSavingMatchPreference, setIsSavingMatchPreference] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [activePanel, setActivePanel] = useState<"edit" | "password" | "matchPreference" | null>(
    null,
  );

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

  const handlePlaceOfBirthChange = useCallback((value: string) => {
    setValues((current) => ({
      ...current,
      latitude: "",
      longitude: "",
      place_of_birth: value,
      timezone: "",
    }));

    setErrors((current) => ({
      ...current,
      latitude: undefined,
      longitude: undefined,
      place_of_birth: undefined,
    }));

    setSuccessMessage(null);
  }, []);

  const handlePlaceOfBirthSelect = useCallback(
    ({
      latitude,
      longitude,
      place,
      utcOffsetMinutes,
    }: {
      latitude?: number;
      longitude?: number;
      place: string;
      utcOffsetMinutes?: number;
    }) => {
      setValues((current) => ({
        ...current,
        latitude:
          typeof latitude === "number" && Number.isFinite(latitude) ? String(latitude) : "",
        longitude:
          typeof longitude === "number" && Number.isFinite(longitude)
            ? String(longitude)
            : "",
        place_of_birth: place,
        timezone: formatUtcOffsetTimezone(utcOffsetMinutes) ?? "",
      }));

      setErrors((current) => ({
        ...current,
        latitude: undefined,
        longitude: undefined,
        place_of_birth: undefined,
      }));

      setSuccessMessage(null);
    },
    [],
  );

  const handleMatchPreferenceChange = (
    field: keyof MatchPreferenceFormValues,
    value: string,
  ) => {
    setMatchPreferenceValues((current) => ({
      ...current,
      [field]: value,
    }));

    setMatchPreferenceErrors((current) => ({
      ...current,
      [field]: undefined,
    }));

    setMatchPreferenceError(null);
    setMatchPreferenceMessage(null);
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
      setError(extractApiErrorMessage(error, "Unable to save your profile right now."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    if (!changePasswordValues.old_password) {
      setPasswordError("Current password is required.");
      return;
    }

    if (changePasswordValues.new_password.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    if (changePasswordValues.new_password !== changePasswordValues.confirm_password) {
      setPasswordError("New password and confirmation must match.");
      return;
    }

    try {
      setIsChangingPassword(true);
      const response = await authService.changePassword({
        old_password: changePasswordValues.old_password,
        new_password: changePasswordValues.new_password,
      });

      setChangePasswordValues(emptyChangePasswordValues);
      setPasswordMessage(extractActionMessage(response, "Password updated."));
      setActivePanel(null);
    } catch (error) {
      setPasswordError(extractApiErrorMessage(error, "Unable to change your password."));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleOpenMatchPreference = async () => {
    setActivePanel("matchPreference");
    setError(null);
    setSuccessMessage(null);
    setPasswordError(null);
    setPasswordMessage(null);
    setMatchPreferenceError(null);
    setMatchPreferenceMessage(null);
    setMatchPreferenceErrors({});

    try {
      setIsLoadingMatchPreference(true);
      const preference = await matchPreferencesService.get();
      setMatchPreference(preference);
      setMatchPreferenceValues(mapMatchPreferenceToFormValues(preference));
    } catch (error) {
      setMatchPreferenceError(
        extractApiErrorMessage(error, "Unable to load match preferences right now."),
      );
    } finally {
      setIsLoadingMatchPreference(false);
    }
  };

  const handleResetMatchPreference = () => {
    setMatchPreferenceValues(mapMatchPreferenceToFormValues(matchPreference));
    setMatchPreferenceErrors({});
    setMatchPreferenceError(null);
    setMatchPreferenceMessage(null);
  };

  const handleSaveMatchPreference = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateMatchPreferenceForm(matchPreferenceValues);
    setMatchPreferenceErrors(nextErrors);
    setMatchPreferenceMessage(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setIsSavingMatchPreference(true);
      setMatchPreferenceError(null);

      const savedPreference = await matchPreferencesService.save(
        buildMatchPreferencePayload(matchPreferenceValues),
      );

      setMatchPreference(savedPreference);
      setMatchPreferenceValues(mapMatchPreferenceToFormValues(savedPreference));
      setMatchPreferenceMessage("Match preferences saved.");
    } catch (error) {
      setMatchPreferenceError(
        extractApiErrorMessage(error, "Unable to save match preferences right now."),
      );
    } finally {
      setIsSavingMatchPreference(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await authService.logout();
    } catch {
      clearSession();
    } finally {
      setIsLoggingOut(false);
      router.replace("/login");
    }
  };

  return (
    <AppScaffold
      title="Profile"
      description="Create and maintain your own birth profile so compatibility runs always use the most accurate source data."
    >
      <div className="space-y-8">
        <SectionCard
          eyebrow="Profile"
          title={
            activePanel === "edit"
              ? profile
                ? "Edit your profile"
                : "Create your profile"
              : activePanel === "password"
                ? "Password access"
                : activePanel === "matchPreference"
                  ? "Match preference"
                  : profile
                    ? "Your profile"
                    : "Create your profile"
          }
          description={
            activePanel === "edit"
              ? "Update your saved profile details only when needed."
              : activePanel === "password"
                ? "Update your password only when needed."
                : activePanel === "matchPreference"
                  ? "Set the criteria used to search possible matches from the database."
                  : "Review your saved details here. Open an action only when you want to change something."
          }
          actions={
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="secondary"
                disabled={activePanel === "edit"}
                onClick={() => {
                  setActivePanel("edit");
                  setError(null);
                  setSuccessMessage(null);
                  setPasswordError(null);
                  setPasswordMessage(null);
                }}
              >
                Edit profile
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={activePanel === "password"}
                onClick={() => {
                  setActivePanel("password");
                  setPasswordError(null);
                  setPasswordMessage(null);
                  setError(null);
                  setSuccessMessage(null);
                }}
              >
                Change password
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={activePanel === "matchPreference" || isLoadingMatchPreference}
                onClick={handleOpenMatchPreference}
              >
                {isLoadingMatchPreference ? "Loading..." : "Match Preference"}
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={isLoggingOut}
                onClick={handleLogout}
              >
                {isLoggingOut ? "Signing out..." : "Logout"}
              </Button>
            </div>
          }
        >
          {isLoading ? (
            <EmptyState>Loading your saved profile...</EmptyState>
          ) : activePanel === "edit" ? (
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
                  <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-[1.75rem] border border-[rgba(144,18,20,0.12)] bg-[#fafafa]/80">
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
                        className="block w-full text-sm text-foreground/72 file:mr-4 file:rounded-full file:border-0 file:bg-[rgba(144,18,20,0.08)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-[rgba(144,18,20,0.12)]"
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

              <GooglePlaceInput
                error={errors.place_of_birth}
                label="Place of Birth"
                placeholder="City, region, country"
                value={values.place_of_birth}
                onChange={handlePlaceOfBirthChange}
                onPlaceSelect={handlePlaceOfBirthSelect}
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

              {error ? <AlertMessage className="whitespace-pre-wrap">{error}</AlertMessage> : null}
              {successMessage ? (
                <AlertMessage className="border-[#eabfb9] bg-[#fafafa] text-[#7f533e]">
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
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    handleReset();
                    setActivePanel(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </form>
          ) : activePanel === "password" ? (
            <div className={`${designSystem.inset} space-y-5 p-5`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-primary">Change password</p>
                  <BodyText className="mt-2">
                    Use your current password, then choose a new one with at least eight characters.
                  </BodyText>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setActivePanel(null);
                    setChangePasswordValues(emptyChangePasswordValues);
                    setPasswordError(null);
                    setPasswordMessage(null);
                  }}
                >
                  Close
                </Button>
              </div>

              <form className="space-y-4" onSubmit={handleChangePassword}>
                <Input
                  label="Current password"
                  type="password"
                  autoComplete="current-password"
                  value={changePasswordValues.old_password}
                  onChange={(event) =>
                    setChangePasswordValues((current) => ({
                      ...current,
                      old_password: event.target.value,
                    }))
                  }
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="New password"
                    type="password"
                    autoComplete="new-password"
                    value={changePasswordValues.new_password}
                    onChange={(event) =>
                      setChangePasswordValues((current) => ({
                        ...current,
                        new_password: event.target.value,
                      }))
                    }
                  />
                  <Input
                    label="Confirm new password"
                    type="password"
                    autoComplete="new-password"
                    value={changePasswordValues.confirm_password}
                    onChange={(event) =>
                      setChangePasswordValues((current) => ({
                        ...current,
                        confirm_password: event.target.value,
                      }))
                    }
                  />
                </div>

                {passwordError ? (
                  <AlertMessage className="whitespace-pre-wrap">{passwordError}</AlertMessage>
                ) : null}
                {passwordMessage ? (
                  <AlertMessage className="border-[#eabfb9] bg-[#fafafa] text-[#7f533e]">
                    {passwordMessage}
                  </AlertMessage>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <Button disabled={isChangingPassword} type="submit">
                    {isChangingPassword ? "Updating..." : "Update password"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setChangePasswordValues(emptyChangePasswordValues);
                      setPasswordError(null);
                      setPasswordMessage(null);
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </form>
            </div>
          ) : activePanel === "matchPreference" ? (
            <div className={`${designSystem.inset} space-y-6 p-5`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-primary">Match Preference</p>
                  <BodyText className="mt-2">
                    These fields are sent to the match preference API for database match searches.
                  </BodyText>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setActivePanel(null);
                    setMatchPreferenceError(null);
                    setMatchPreferenceMessage(null);
                    setMatchPreferenceErrors({});
                  }}
                >
                  Close
                </Button>
              </div>

              {isLoadingMatchPreference ? (
                <EmptyState>Loading match preferences...</EmptyState>
              ) : (
                <form className="space-y-6" onSubmit={handleSaveMatchPreference}>
                  <div className="grid gap-5 md:grid-cols-3">
                    <SelectInput
                      error={matchPreferenceErrors.preferred_gender}
                      label="Preferred Gender"
                      options={genderChoices}
                      placeholder="Select preferred gender"
                      value={matchPreferenceValues.preferred_gender}
                      onChange={(event) =>
                        handleMatchPreferenceChange("preferred_gender", event.target.value)
                      }
                    />
                    <Input
                      error={matchPreferenceErrors.preferred_age_min}
                      inputMode="numeric"
                      label="Preferred Age Min"
                      min="0"
                      placeholder="25"
                      type="number"
                      value={matchPreferenceValues.preferred_age_min}
                      onChange={(event) =>
                        handleMatchPreferenceChange("preferred_age_min", event.target.value)
                      }
                    />
                    <Input
                      error={matchPreferenceErrors.preferred_age_max}
                      inputMode="numeric"
                      label="Preferred Age Max"
                      min="0"
                      placeholder="35"
                      type="number"
                      value={matchPreferenceValues.preferred_age_max}
                      onChange={(event) =>
                        handleMatchPreferenceChange("preferred_age_max", event.target.value)
                      }
                    />
                    <Input
                      error={matchPreferenceErrors.preferred_distance_km}
                      inputMode="decimal"
                      label="Preferred Distance KM"
                      min="0"
                      placeholder="50"
                      type="number"
                      value={matchPreferenceValues.preferred_distance_km}
                      onChange={(event) =>
                        handleMatchPreferenceChange("preferred_distance_km", event.target.value)
                      }
                    />
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <SelectInput
                      label="Preferred Relationship Intent"
                      options={relationshipIntentChoices}
                      placeholder="Select relationship intent"
                      value={matchPreferenceValues.preferred_relationship_intent}
                      onChange={(event) =>
                        handleMatchPreferenceChange(
                          "preferred_relationship_intent",
                          event.target.value,
                        )
                      }
                    />
                    <SelectInput
                      label="Preferred Marital Status"
                      options={maritalStatusChoices}
                      placeholder="Select marital status"
                      value={matchPreferenceValues.preferred_marital_status}
                      onChange={(event) =>
                        handleMatchPreferenceChange(
                          "preferred_marital_status",
                          event.target.value,
                        )
                      }
                    />
                  </div>

                  <div className="space-y-4">
                    <p className={designSystem.label}>Compatibility Weights</p>
                    <div className="grid gap-5 md:grid-cols-5">
                      <Input
                        error={matchPreferenceErrors.modern_methods}
                        inputMode="decimal"
                        label="Modern Methods"
                        type="number"
                        value={matchPreferenceValues.modern_methods}
                        onChange={(event) =>
                          handleMatchPreferenceChange("modern_methods", event.target.value)
                        }
                      />
                      <Input
                        error={matchPreferenceErrors.karmic_glue}
                        inputMode="decimal"
                        label="Karmic Glue"
                        type="number"
                        value={matchPreferenceValues.karmic_glue}
                        onChange={(event) =>
                          handleMatchPreferenceChange("karmic_glue", event.target.value)
                        }
                      />
                      <Input
                        error={matchPreferenceErrors.ancient_methods}
                        inputMode="decimal"
                        label="Ancient Methods"
                        type="number"
                        value={matchPreferenceValues.ancient_methods}
                        onChange={(event) =>
                          handleMatchPreferenceChange("ancient_methods", event.target.value)
                        }
                      />
                      <Input
                        error={matchPreferenceErrors.deal_maker}
                        inputMode="decimal"
                        label="Deal Maker"
                        type="number"
                        value={matchPreferenceValues.deal_maker}
                        onChange={(event) =>
                          handleMatchPreferenceChange("deal_maker", event.target.value)
                        }
                      />
                      <Input
                        error={matchPreferenceErrors.sizzle}
                        inputMode="decimal"
                        label="Sizzle"
                        type="number"
                        value={matchPreferenceValues.sizzle}
                        onChange={(event) =>
                          handleMatchPreferenceChange("sizzle", event.target.value)
                        }
                      />
                    </div>
                  </div>

                  {matchPreferenceError ? (
                    <AlertMessage className="whitespace-pre-wrap">
                      {matchPreferenceError}
                    </AlertMessage>
                  ) : null}
                  {matchPreferenceMessage ? (
                    <AlertMessage className="border-[#eabfb9] bg-[#fafafa] text-[#7f533e]">
                      {matchPreferenceMessage}
                    </AlertMessage>
                  ) : null}

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className={`${designSystem.inset} p-4`}>
                      <p className={designSystem.label}>Age Range</p>
                      <p className="mt-3 text-lg font-medium text-primary">
                        {displayNumberValue(matchPreferenceValues.preferred_age_min)} -{" "}
                        {displayNumberValue(matchPreferenceValues.preferred_age_max)}
                      </p>
                    </div>
                    <div className={`${designSystem.inset} p-4`}>
                      <p className={designSystem.label}>Gender</p>
                      <p className="mt-3 text-lg font-medium text-primary">
                        {displayChoiceValue(matchPreferenceValues.preferred_gender, genderChoices)}
                      </p>
                    </div>
                    <div className={`${designSystem.inset} p-4`}>
                      <p className={designSystem.label}>Distance KM</p>
                      <p className="mt-3 text-lg font-medium text-primary">
                        {displayNumberValue(matchPreferenceValues.preferred_distance_km)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button disabled={isSavingMatchPreference} type="submit">
                      {isSavingMatchPreference ? "Saving..." : "Save match preference"}
                    </Button>
                    <Button
                      disabled={isSavingMatchPreference}
                      type="button"
                      variant="secondary"
                      onClick={handleResetMatchPreference}
                    >
                      Reset fields
                    </Button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className={`${designSystem.inset} flex flex-col items-center gap-4 p-5`}>
                  <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-[1.75rem] border border-[rgba(144,18,20,0.12)] bg-[#fafafa]/80">
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
                  <div className="text-center">
                    <p className="font-display text-3xl font-semibold text-primary">
                      {displayName}
                    </p>
                    <BodyText className="mt-2">{accountLabel}</BodyText>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className={`${designSystem.inset} p-5`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-foreground/45">
                      First Name
                    </p>
                    <p className="mt-3 text-lg font-medium text-primary">
                      {displayValue(values.first_name)}
                    </p>
                  </div>
                  <div className={`${designSystem.inset} p-5`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-foreground/45">
                      Last Name
                    </p>
                    <p className="mt-3 text-lg font-medium text-primary">
                      {displayValue(values.last_name)}
                    </p>
                  </div>
                  <div className={`${designSystem.inset} p-5`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-foreground/45">
                      Date of Birth
                    </p>
                    <p className="mt-3 text-lg font-medium text-primary">
                      {displayValue(values.date_of_birth)}
                    </p>
                  </div>
                  <div className={`${designSystem.inset} p-5`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-foreground/45">
                      Time of Birth
                    </p>
                    <p className="mt-3 text-lg font-medium text-primary">
                      {displayValue(values.time_of_birth)}
                    </p>
                  </div>
                  <div className={`${designSystem.inset} p-5 md:col-span-2`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-foreground/45">
                      Place of Birth
                    </p>
                    <p className="mt-3 text-lg font-medium text-primary">
                      {displayValue(values.place_of_birth)}
                    </p>
                  </div>
                  <div className={`${designSystem.inset} p-5`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-foreground/45">
                      Latitude
                    </p>
                    <p className="mt-3 text-lg font-medium text-primary">
                      {displayValue(values.latitude)}
                    </p>
                  </div>
                  <div className={`${designSystem.inset} p-5`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-foreground/45">
                      Longitude
                    </p>
                    <p className="mt-3 text-lg font-medium text-primary">
                      {displayValue(values.longitude)}
                    </p>
                  </div>
                </div>
              </div>

              {error ? <AlertMessage className="whitespace-pre-wrap">{error}</AlertMessage> : null}
              {successMessage ? (
                <AlertMessage className="border-[#eabfb9] bg-[#fafafa] text-[#7f533e]">
                  {successMessage}
                </AlertMessage>
              ) : null}
            </div>
          )}
        </SectionCard>
      </div>
    </AppScaffold>
  );
}
