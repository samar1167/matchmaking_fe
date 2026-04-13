"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  CreatePrivatePersonRequest,
  PrivatePerson,
} from "@/types/private-persons";

export interface PrivatePersonFormValues {
  name: string;
  date_of_birth: string;
  time_of_birth: string;
  place_of_birth: string;
}

interface PrivatePersonFormProps {
  initialValues?: PrivatePersonFormValues;
  isSubmitting?: boolean;
  mode: "create" | "edit";
  onCancel?: () => void;
  onSubmit: (values: CreatePrivatePersonRequest) => Promise<void> | void;
}

type ValidationErrors = Partial<Record<keyof PrivatePersonFormValues, string>>;

const emptyValues: PrivatePersonFormValues = {
  name: "",
  date_of_birth: "",
  time_of_birth: "",
  place_of_birth: "",
};

export const mapPrivatePersonToFormValues = (
  privatePerson: PrivatePerson,
): PrivatePersonFormValues => ({
  name: privatePerson.name,
  date_of_birth: privatePerson.date_of_birth,
  time_of_birth: privatePerson.time_of_birth ?? "",
  place_of_birth: privatePerson.place_of_birth ?? "",
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

  if (!values.time_of_birth) {
    errors.time_of_birth = "Time of birth is required.";
  }

  if (!values.place_of_birth.trim()) {
    errors.place_of_birth = "Place of birth is required.";
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
        date_of_birth: values.date_of_birth,
        time_of_birth: values.time_of_birth,
        place_of_birth: values.place_of_birth.trim(),
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
          label="Time of Birth"
          type="time"
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

      <div className="flex flex-wrap gap-3">
        <Button disabled={isSubmitting} type="submit">
          {submitLabel}
        </Button>
        {mode === "edit" && onCancel ? (
          <Button disabled={isSubmitting} onClick={onCancel} variant="secondary">
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
