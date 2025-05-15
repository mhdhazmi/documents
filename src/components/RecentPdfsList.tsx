"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function RecentPdfsList() {
  const router = useRouter();
  const recentPdfs = useQuery(api.pdf.queries.getRecentPdfs, { limit: 5 });
  const [initialLoad, setInitialLoad] = useState(true);

  // Set initial load to false after component mounts
  useEffect(() => {
    setTimeout(() => {
      setInitialLoad(false);
    }, 500);
  }, []);

  // Function to handle PDF click
  const handlePdfClick = (pdfId: string) => {
    router.push(`/pdf/${pdfId}/pages`);
  };

  // Loading skeleton for the recent PDFs section
  if (recentPdfs === undefined) {
    return (
      <div className="mt-1 mb-2 w-full max-w-4xl mx-auto px-4 animate-in fade-in duration-300">
        <div className="flex items-center justify-between mb-2">
          <div className="h-px bg-gradient-to-l from-emerald-500/20 to-transparent flex-grow mr-2"></div>
          <h3 className="text-white/80 text-xs font-medium">آخر المستندات</h3>
          <div className="h-px bg-gradient-to-r from-emerald-500/20 to-transparent flex-grow ml-2"></div>
        </div>
        
        {/* Skeleton loading for PDFs */}
        <div className="flex flex-row-reverse flex-wrap gap-2 justify-center">
          {Array.from({ length: 5 }).map((_, index) => (
            <div 
              key={index}
              className="flex items-center justify-end gap-1 px-2 py-1 rounded-md
                border border-emerald-800/20 bg-emerald-950/50"
              dir="rtl"
            >
              <Skeleton className="h-4 w-20 bg-emerald-800/20" />
              <Skeleton className="w-3 h-3 rounded-full bg-emerald-800/20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // If there are no PDFs after initial load, show empty state
  if (recentPdfs.length === 0 && !initialLoad) {
    return null;
  }

  return (
    <div className="mt-1 mb-2 w-full max-w-4xl mx-auto px-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-2">
        <div className="h-px bg-gradient-to-l from-emerald-500/20 to-transparent flex-grow mr-2"></div>
        <h3 className="text-white/80 text-xs font-medium">آخر المستندات</h3>
        <div className="h-px bg-gradient-to-r from-emerald-500/20 to-transparent flex-grow ml-2"></div>
      </div>
      
      {/* Compact source chips - horizontal list */}
      <div className="flex flex-row-reverse flex-wrap gap-2 justify-center">
        {recentPdfs.map((pdf) => (
          <button
            key={pdf._id.toString()}
            onClick={() => handlePdfClick(pdf._id)}
            className="flex items-center justify-end gap-1 px-2 py-1 rounded-md text-xs
              transition-all duration-200 border bg-emerald-950/70 text-white/80 
              border-emerald-800/30 hover:bg-emerald-900/70 hover:text-white 
              hover:border-emerald-500/50"
            dir="rtl"
            title={pdf.filename}
          >
            <span className="truncate max-w-[100px]">
              {pdf.filename.replace(/\.[^/.]+$/, "")}
            </span>
            <FileText className="w-3 h-3 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}