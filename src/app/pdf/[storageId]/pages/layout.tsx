/* ------------------------------------------------------------------ */
/* src/app/pdf/[storageId]/pages/layout.tsx                           */
/* ------------------------------------------------------------------ */
"use client";

import React from "react";
import { useParams } from "next/navigation";
import { PdfPageProvider } from "@/app/pdf/pages/context";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

export default function PagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ───────────────────────────────────────────────────────────────────
  // 1. Get the dynamic segment from the url          /pdf/[storageId]/
  // ───────────────────────────────────────────────────────────────────
  const { storageId } = useParams<{ storageId: string }>();

  // 2. Load PDF meta-data to know how many pages we have
  const pdf = useQuery(api.pdf.queries.getPdf, {
    pdfId: storageId as Id<"pdfs">,
  });

  const totalPages = pdf?.pageCount ?? 0;

  // 3. Provide page-navigation context to the subtree
  return (
    <PdfPageProvider initialPage={1} totalPages={totalPages}>
      <div className="grid h-full w-full gap-4">{children}</div>
    </PdfPageProvider>
  );
}
