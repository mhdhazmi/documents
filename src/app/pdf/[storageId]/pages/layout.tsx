// src/app/pdf/[storageId]/pages/layout.tsx (update)
"use client";

import { PdfPageProvider } from "@/app/pdf/pages/context";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

export default function PagesLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { storageId: string };
}) {
  // Get PDF data to get total pages
  const pdf = useQuery(api.pdf.queries.getPdf, {
    pdfId: params.storageId as Id<"pdfs">,
  });

  const totalPages = pdf?.pageCount || 0;

  return (
    <PdfPageProvider initialPage={1} totalPages={totalPages}>
      <div className="h-full relative">{children}</div>
    </PdfPageProvider>
  );
}
