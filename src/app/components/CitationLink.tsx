// src/app/components/CitationLink.tsx
"use client";

import React from "react";
import { parseCitations, ParsedCitation } from "@/utils/citationParser";

interface CitationLinkProps {
  citation: ParsedCitation;
  onClick: (filename: string, pageNumber?: number) => void;
  className?: string;
}

export function CitationLink({
  citation,
  onClick,
  className = "",
}: CitationLinkProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onClick(citation.filename, citation.pageNumber || undefined);
  };

  return (
    <button
      onClick={handleClick}
      className={`text-emerald-400 hover:text-emerald-300 underline cursor-pointer transition-colors ${className}`}
      title={`Go to ${citation.filename}${citation.pageNumber ? `, page ${citation.pageNumber}` : ""}`}
    >
      {citation.fullCitation}
    </button>
  );
}

interface ProcessedTextProps {
  text: string;
  onCitationClick: (filename: string, pageNumber?: number) => void;
  className?: string;
}

export function ProcessedText({
  text,
  onCitationClick,
  className = "",
}: ProcessedTextProps) {
  const citations = parseCitations(text);

  if (citations.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // Split text into parts and citations
  const parts: Array<{
    type: "text" | "citation";
    content: string | ParsedCitation;
  }> = [];
  let lastIndex = 0;

  citations.forEach((citation) => {
    const index = text.indexOf(citation.fullCitation, lastIndex);

    // Add text before citation
    if (index > lastIndex) {
      parts.push({
        type: "text",
        content: text.slice(lastIndex, index),
      });
    }

    // Add citation
    parts.push({
      type: "citation",
      content: citation,
    });

    lastIndex = index + citation.fullCitation.length;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: "text",
      content: text.slice(lastIndex),
    });
  }

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.type === "text" ? (
          <span key={index}>{part.content as string}</span>
        ) : (
          <CitationLink
            key={index}
            citation={part.content as ParsedCitation}
            onClick={onCitationClick}
          />
        )
      )}
    </span>
  );
}
