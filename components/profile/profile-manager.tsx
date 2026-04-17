"use client";

import { isAxiosError } from "axios";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppScaffold } from "@/components/layout/app-scaffold";
import { Button } from "@/components/ui/button";
import {
  AlertMessage,
  BodyText,
  EmptyState,
  designSystem,
} from "@/components/ui/design-system";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/section-card";
import { authService } from "@/services/authService";
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

interface ChangePasswordValues {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

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

const extractApiErrorMessage = (error: unknown, fallback: string) => {
  if (isAxiosError<ApiErrorResponse | Record<string, string[]>>(error)) {
    const data = error.response?.data;

    if (data && typeof data === "object") {
      if ("message" in data && typeof data.message === "string") {
        return data.message;
      }

      if ("error" in data && typeof data.error === "string") {
        return data.error;
      }

      const fieldErrors = Object.values(data)
        .flatMap((value) => (Array.isArray(value) ? value : []))
        .filter((value): value is string => typeof value === "string");

      if (fieldErrors.length > 0) {
        return fieldErrors[0];
      }
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
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [activePanel, setActivePanel] = useState<"edit" | "password" | null>(null);

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
                : profile
                  ? "Your profile"
                  : "Create your profile"
          }
          description={
            activePanel === "edit"
              ? "Update your saved profile details only when needed."
              : activePanel === "password"
                ? "Update your password only when needed."
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

                {passwordError ? <AlertMessage>{passwordError}</AlertMessage> : null}
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
                  <div className={`${designSystem.inset} p-5 md:col-span-2`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-foreground/45">
                      Timezone
                    </p>
                    <p className="mt-3 text-lg font-medium text-primary">
                      {displayValue(values.timezone)}
                    </p>
                  </div>
                </div>
              </div>

              {error ? <AlertMessage>{error}</AlertMessage> : null}
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
