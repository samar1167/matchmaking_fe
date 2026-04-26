"use client";

import { useMemo, useState } from "react";
import { Input, SelectInput } from "@/components/ui/input";
import type {
  CreatePrivatePersonRequest,
  PrivatePerson,
} from "@/types/private-persons";

export interface PrivatePersonFormValues {
  name: string;
  gender: string;
  date_of_birth: string;
  time_of_birth: string;
  place_of_birth: string;
  latitude: string;
  longitude: string;
}

interface PrivatePersonFormProps {
  initialValues?: PrivatePersonFormValues;
  isSubmitting?: boolean;
  mode: "create" | "edit";
  onCancel?: () => void;
  onSubmit: (values: CreatePrivatePersonRequest) => Promise<void> | void;
}

type ValidationErrors = Partial<Record<keyof PrivatePersonFormValues, string>>;

const genderChoices = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non_binary", label: "Non-binary" },
  { value: "other", label: "Other" },
  { value: "any", label: "Any" },
];

const emptyValues: PrivatePersonFormValues = {
  name: "",
  gender: "",
  date_of_birth: "",
  time_of_birth: "",
  place_of_birth: "",
  latitude: "",
  longitude: "",
};

export const mapPrivatePersonToFormValues = (
  privatePerson: PrivatePerson,
): PrivatePersonFormValues => ({
  name: privatePerson.name,
  gender: privatePerson.gender ?? "",
  date_of_birth: privatePerson.date_of_birth,
  time_of_birth: privatePerson.time_of_birth ?? "",
  place_of_birth: privatePerson.place_of_birth ?? "",
  latitude:
    typeof privatePerson.latitude === "number" ? String(privatePerson.latitude) : "",
  longitude:
    typeof privatePerson.longitude === "number" ? String(privatePerson.longitude) : "",
});

const validatePrivatePersonForm = (
  values: PrivatePersonFormValues,
): ValidationErrors => {
  const errors: ValidationErrors = {};
  const today = new Date().toISOString().split("T")[0];

  if (!values.name.trim()) {
    errors.name = "Name is required.";
  }

  if (!values.date_of_birth) {
    errors.date_of_birth = "Date of birth is required.";
  } else if (values.date_of_birth > today) {
    errors.date_of_birth = "Date of birth cannot be in the future.";
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

export function PrivatePersonForm({
  initialValues = emptyValues,
  isSubmitting = false,
  mode,
  onCancel,
  onSubmit,
}: PrivatePersonFormProps) {
  const [values, setValues] = useState<PrivatePersonFormValues>(initialValues);
  const [errors, setErrors] = useState<ValidationErrors>({});

  const submitLabel = useMemo(() => {
    if (mode === "edit") {
      return isSubmitting ? "Saving..." : "Save changes";
    }

    return isSubmitting ? "Adding..." : "Add person";
  }, [isSubmitting, mode]);

  const handleChange = (field: keyof PrivatePersonFormValues, value: string) => {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validatePrivatePersonForm(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      await onSubmit({
        name: values.name.trim(),
        gender: values.gender || undefined,
        date_of_birth: values.date_of_birth,
        time_of_birth: values.time_of_birth || undefined,
        place_of_birth: values.place_of_birth.trim(),
        latitude: values.latitude ? Number(values.latitude) : undefined,
        longitude: values.longitude ? Number(values.longitude) : undefined,
      });

      if (mode === "create") {
        setValues(emptyValues);
      }
    } catch {
      return;
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <Input
        autoFocus={mode === "edit"}
        label="Name"
        placeholder="Enter full name"
        value={values.name}
        onChange={(event) => handleChange("name", event.target.value)}
        error={errors.name}
      />

      <div className="grid gap-5 md:grid-cols-2">
        <Input
          label="Date of Birth"
          type="date"
          value={values.date_of_birth}
          onChange={(event) => handleChange("date_of_birth", event.target.value)}
          error={errors.date_of_birth}
        />

        <Input
          label="Time of Birth (Optional)"
          type="time"
          step="1"
          value={values.time_of_birth}
          onChange={(event) => handleChange("time_of_birth", event.target.value)}
          error={errors.time_of_birth}
        />
      </div>

      <Input
        label="Place of Birth"
        placeholder="City, region, country"
        value={values.place_of_birth}
        onChange={(event) => handleChange("place_of_birth", event.target.value)}
        error={errors.place_of_birth}
      />

      {mode === "edit" ? (
        <>
          <SelectInput
            label="Gender"
            options={genderChoices}
            placeholder="Select gender"
            value={values.gender}
            onChange={(event) => handleChange("gender", event.target.value)}
            error={errors.gender}
          />

          <div className="grid gap-5 md:grid-cols-2">
            <Input
              label="Latitude"
              type="number"
              step="any"
              placeholder="Enter latitude"
              value={values.latitude}
              onChange={(event) => handleChange("latitude", event.target.value)}
              error={errors.latitude}
            />

            <Input
              label="Longitude"
              type="number"
              step="any"
              placeholder="Enter longitude"
              value={values.longitude}
              onChange={(event) => handleChange("longitude", event.target.value)}
              error={errors.longitude}
            />
          </div>
        </>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#901214] px-5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(144,18,20,0.14)] transition hover:bg-[#961116] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {submitLabel}
        </button>
        {onCancel ? (
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#C07771] bg-[#fafafa] px-5 text-sm font-bold text-[#901214] transition hover:border-[#901214] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
