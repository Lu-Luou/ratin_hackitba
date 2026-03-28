import React, { createContext, useContext, useState, ReactNode } from "react";
import { FieldProfile, mockFields } from "@/data/mockFields";

interface FieldsContextType {
  fields: FieldProfile[];
  addField: (name: string, hectares: number) => void;
  selectedField: FieldProfile | null;
  setSelectedField: (field: FieldProfile | null) => void;
}

const FieldsContext = createContext<FieldsContextType | null>(null);

export function FieldsProvider({ children }: { children: ReactNode }) {
  const [fields, setFields] = useState<FieldProfile[]>(mockFields);
  const [selectedField, setSelectedField] = useState<FieldProfile | null>(null);

  const addField = (name: string, hectares: number) => {
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const newField: FieldProfile = {
      id: String(Date.now()),
      name,
      location: "Sin definir",
      hectares,
      score: Math.round(50 + Math.random() * 40),
      scoreTrend: 0,
      monthlyRevenueChange: 0,
      revenueHistory: months.map((m) => ({ month: m, actual: 0, projected: 0 })),
      yieldHistory: months.map((m) => ({ month: m, value: 0 })),
      repayment: { ratio: 1.0, liquidity: "Media", debtToAsset: 0.3 },
      risk: { climate: "Medio", market: "Medio", logistics: "Medio", climateScore: 50, marketScore: 50, logisticsScore: 50 },
      zone: "Sin definir",
      createdAt: new Date().toISOString().split("T")[0],
    };
    setFields((prev) => [...prev, newField]);
  };

  return (
    <FieldsContext.Provider value={{ fields, addField, selectedField, setSelectedField }}>
      {children}
    </FieldsContext.Provider>
  );
}

export function useFields() {
  const ctx = useContext(FieldsContext);
  if (!ctx) throw new Error("useFields must be used within FieldsProvider");
  return ctx;
}
