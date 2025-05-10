// /app/pdf/[pdfId]/pages/page.tsx
// Note: pdfId is actually the storageId, keeping the same convention as /app/pdf/[storageId]
"use client";

import { useParams, useSearchParams } from "next/navigation";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";




export default function PdfPages() {
  const { pdfId } = useParams<{ pdfId: string }>();
  const searchParams = useSearchParams();
  const pageId = searchParams.get("pageId");

  /* Log once on mount; eslint rule for console is disabled in repo already */
  console.log("pdfId →", pdfId, "pageId →", pageId);

  return (
    <main className="container mx-auto p-4">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="item-1">
          <AccordionTrigger>Hello Accordion</AccordionTrigger>
          <AccordionContent>
            Placeholder – real page content coming in FE-02 +
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </main>
  );
}