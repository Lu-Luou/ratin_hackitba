"use client";

import React, { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { FieldProfile } from "@/types/field";

interface FieldsContextType {
  fields: FieldProfile[];
  addField: (payload: {
    name: string;
    hectares: number;
    location?: string;
    zone?: string;
    latitude?: number | null;
    longitude?: number | null;
    bboxMinLon?: number | null;
    bboxMinLat?: number | null;
    bboxMaxLon?: number | null;
    bboxMaxLat?: number | null;
    defaultCostPerHaUsd?: number;
  }) => Promise<void>;
  updateField: (
    fieldId: string,
    payload: {
      name?: string;
      hectares?: number;
      location?: string;
      zone?: string;
      latitude?: number | null;
      longitude?: number | null;
      bboxMinLon?: number | null;
      bboxMinLat?: number | null;
      bboxMaxLon?: number | null;
      bboxMaxLat?: number | null;
      defaultCostPerHaUsd?: number;
    },
  ) => Promise<void>;
  deleteField: (fieldId: string) => Promise<void>;
  reorderFields: (orderedFieldIds: string[]) => Promise<void>;
  refreshFields: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  selectedField: FieldProfile | null;
  setSelectedField: (field: FieldProfile | null) => void;
}

const FieldsContext = createContext<FieldsContextType | null>(null);

function sortFieldsByOrder(list: FieldProfile[]) {
  return [...list].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }

    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function FieldsProvider({ children }: { children: ReactNode }) {
  const [fields, setFields] = useState<FieldProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedField, setSelectedField] = useState<FieldProfile | null>(null);

  const refreshFields = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/fields", {
        method: "GET",
        credentials: "include",
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudieron cargar los campos.");
      }

      const data = Array.isArray(payload?.data) ? (payload.data as FieldProfile[]) : [];
      const sortedData = sortFieldsByOrder(data);

      setFields(sortedData);
      setError(null);
      setSelectedField((prev) => {
        if (!prev) {
          return null;
        }

        return sortedData.find((field) => field.id === prev.id) ?? null;
      });
    } catch (loadError) {
      setFields([]);
      setSelectedField(null);
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los campos.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshFields();
  }, [refreshFields]);

  const addField = useCallback(async (payload: {
    name: string;
    hectares: number;
    location?: string;
    zone?: string;
    latitude?: number | null;
    longitude?: number | null;
    bboxMinLon?: number | null;
    bboxMinLat?: number | null;
    bboxMaxLon?: number | null;
    bboxMaxLat?: number | null;
    defaultCostPerHaUsd?: number;
  }) => {
    try {
      const response = await fetch("/api/fields", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error ?? "No se pudo crear el campo.");
      }

      const createdField = data?.data as FieldProfile | undefined;

      if (!createdField) {
        throw new Error("No se recibio el nuevo campo desde el servidor.");
      }

      setFields((prev) => sortFieldsByOrder([...prev, createdField]));
      setError(null);
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : "No se pudo crear el campo.";
      setError(message);
      throw createError;
    }
  }, []);

  const updateField = useCallback(
    async (
      fieldId: string,
      payload: {
        name?: string;
        hectares?: number;
        location?: string;
        zone?: string;
        latitude?: number | null;
        longitude?: number | null;
        bboxMinLon?: number | null;
        bboxMinLat?: number | null;
        bboxMaxLon?: number | null;
        bboxMaxLat?: number | null;
        defaultCostPerHaUsd?: number;
      },
    ) => {
      try {
        const response = await fetch(`/api/fields/${fieldId}`, {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data?.error ?? "No se pudo actualizar el campo.");
        }

        const updatedField = data?.data as FieldProfile | undefined;

        if (!updatedField) {
          throw new Error("No se recibio el campo actualizado desde el servidor.");
        }

        setFields((prev) => sortFieldsByOrder(prev.map((field) => (field.id === updatedField.id ? updatedField : field))));
        setSelectedField((prev) => (prev?.id === updatedField.id ? updatedField : prev));
        setError(null);
      } catch (updateError) {
        const message = updateError instanceof Error ? updateError.message : "No se pudo actualizar el campo.";
        setError(message);
        throw updateError;
      }
    },
    [],
  );

  const deleteField = useCallback(async (fieldId: string) => {
    try {
      const response = await fetch(`/api/fields/${fieldId}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error ?? "No se pudo eliminar el campo.");
      }

      setFields((prev) => prev.filter((field) => field.id !== fieldId));
      setSelectedField((prev) => (prev?.id === fieldId ? null : prev));
      setError(null);
    } catch (removeError) {
      const message = removeError instanceof Error ? removeError.message : "No se pudo eliminar el campo.";
      setError(message);
      throw removeError;
    }
  }, []);

  const reorderFields = useCallback(
    async (orderedFieldIds: string[]) => {
      const previousFields = fields;
      const positionById = new Map(orderedFieldIds.map((fieldId, index) => [fieldId, index]));
      const reorderedFields = sortFieldsByOrder(
        fields.map((field) => {
          const nextOrder = positionById.get(field.id);

          return {
            ...field,
            sortOrder: nextOrder ?? field.sortOrder,
          };
        }),
      );

      setFields(reorderedFields);
      setSelectedField((prev) => (prev ? reorderedFields.find((field) => field.id === prev.id) ?? null : null));

      try {
        const response = await fetch("/api/fields/reorder", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderedFieldIds,
          }),
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload?.error ?? "No se pudo guardar el orden de los campos.");
        }

        setError(null);
      } catch (reorderError) {
        setFields(previousFields);
        setSelectedField((prev) => (prev ? previousFields.find((field) => field.id === prev.id) ?? null : null));

        const message = reorderError instanceof Error ? reorderError.message : "No se pudo guardar el orden de los campos.";
        setError(message);
        throw reorderError;
      }
    },
    [fields],
  );

  return (
    <FieldsContext.Provider
      value={{
        fields,
        addField,
        updateField,
        deleteField,
        reorderFields,
        refreshFields,
        isLoading,
        error,
        selectedField,
        setSelectedField,
      }}
    >
      {children}
    </FieldsContext.Provider>
  );
}

export function useFields() {
  const ctx = useContext(FieldsContext);
  if (!ctx) throw new Error("useFields must be used within FieldsProvider");
  return ctx;
}
