"use client";

import { useEffect, useState } from "react";
import {
  mapPrivatePersonToFormValues,
  PrivatePersonForm,
} from "@/components/private-persons/private-person-form";
import { PrivatePersonCard } from "@/components/private-persons/private-person-card";
import { AppScaffold } from "@/components/layout/app-scaffold";
import {
  AlertMessage,
  BodyText,
  EmptyState,
  designSystem,
} from "@/components/ui/design-system";
import { SectionCard } from "@/components/ui/section-card";
import { privatePersonsService } from "@/services/privatePersonsService";
import type {
  CreatePrivatePersonRequest,
  PrivatePerson,
} from "@/types/private-persons";

export function PrivatePersonsManager() {
  const [privatePersons, setPrivatePersons] = useState<PrivatePerson[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [isCreatePending, setIsCreatePending] = useState(false);
  const [isEditPending, setIsEditPending] = useState(false);
  const [isDeletePending, setIsDeletePending] = useState(false);

  useEffect(() => {
    void loadPrivatePersons();
  }, []);

  const loadPrivatePersons = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await privatePersonsService.list();
      setPrivatePersons(response.results);
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

  return (
    <AppScaffold
      title="Private Persons"
      description="Maintain a refined library of private birth profiles for future comparisons. Each record is designed for quick scanning, editing, and repeat compatibility use."
    >
      <SectionCard
        eyebrow="Private Persons"
        title="Manage birth profiles"
        description="Create and maintain private birth profiles used for matchmaking comparisons. Keep entries focused, accurate, and easy to review."
      >
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-3xl font-semibold tracking-tight text-primary">
                  Saved persons
                </h3>
                <BodyText className="mt-2 leading-6 text-foreground/62">
                  {privatePersons.length} profile
                  {privatePersons.length === 1 ? "" : "s"} available
                </BodyText>
              </div>
            </div>

            {loading ? <EmptyState>Loading private persons...</EmptyState> : null}

            {!loading && privatePersons.length === 0 ? (
              <EmptyState>
                No private persons have been added yet. Use the form to create the first
                record.
              </EmptyState>
            ) : null}

            {!loading ? (
              <div className="space-y-4">
                {privatePersons.map((privatePerson) =>
                  editingId === privatePerson.id ? (
                    <article
                      key={privatePerson.id}
                      className={`${designSystem.surface} border-[rgba(192,119,113,0.28)] bg-[linear-gradient(180deg,rgba(250,250,250,0.92)_0%,rgba(245,213,200,0.82)_100%)] p-6 shadow-[0_18px_40px_rgba(12,13,10,0.09)]`}
                    >
                      <div className="mb-5">
                        <p className={designSystem.eyebrow}>Edit Mode</p>
                        <h3 className="mt-3 font-display text-3xl font-semibold tracking-tight text-primary">
                          Edit private person
                        </h3>
                        <BodyText className="mt-2 leading-6 text-foreground/62">
                          Update the birth details and save the changes.
                        </BodyText>
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
                      key={privatePerson.id}
                      isDeleting={isDeletePending && deleteTargetId === privatePerson.id}
                      onDelete={() => handleDelete(privatePerson.id)}
                      onEdit={() => setEditingId(privatePerson.id)}
                      privatePerson={privatePerson}
                    />
                  ),
                )}
              </div>
            ) : null}
          </div>

          <SectionCard
            title="Add new person"
            description="Fill in the birth details carefully. All fields are required for a complete record."
          >
            <PrivatePersonForm
              isSubmitting={isCreatePending}
              mode="create"
              onSubmit={handleCreate}
            />
          </SectionCard>
        </div>

        {error ? <AlertMessage className="mt-6">{error}</AlertMessage> : null}
      </SectionCard>
    </AppScaffold>
  );
}
