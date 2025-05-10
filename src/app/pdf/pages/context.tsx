// src/app/pdf/pages/context.tsx (update)
"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface PdfPageContextValue {
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
}

const PdfPageContext = createContext<PdfPageContextValue | undefined>(
  undefined
);

interface PdfPageProviderProps {
  children: ReactNode;
  initialPage?: number;
  totalPages?: number;
}

export const PdfPageProvider = ({
  children,
  initialPage = 1,
  totalPages = 0,
}: PdfPageProviderProps) => {
  const [page, setPage] = useState<number>(initialPage);

  const value = {
    page,
    setPage,
    totalPages,
  };

  return (
    <PdfPageContext.Provider value={value}>{children}</PdfPageContext.Provider>
  );
};

export const usePdfPage = () => {
  const context = useContext(PdfPageContext);
  if (context === undefined) {
    throw new Error("usePdfPage must be used within a PdfPageProvider");
  }
  return context;
};
