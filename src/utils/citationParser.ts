// src/utils/citationParser.ts - Utility to parse citations from text

export interface ParsedCitation {
  filename: string;
  pageNumber: number | null;
  fullCitation: string;
}

export interface CitationSummary {
  [filename: string]: {
    pages: Set<number>;
    totalReferences: number;
  };
}

/**
 * Parse citations from bot response text
 * Supports format: (filename.pdf, p. 5) or (filename.pdf)
 */
export function parseCitations(text: string): ParsedCitation[] {
  // Regex to match citations in the format (filename.pdf, p. 5) or (filename.pdf)
  const citationRegex = /\(([^,)]+\.pdf)(?:,\s*p\.\s*(\d+))?\)/g;
  const citations: ParsedCitation[] = [];

  let match;
  while ((match = citationRegex.exec(text)) !== null) {
    const filename = match[1];
    const pageNumber = match[2] ? parseInt(match[2], 10) : null;
    const fullCitation = match[0];

    citations.push({
      filename,
      pageNumber,
      fullCitation,
    });
  }

  return citations;
}

/**
 * Group citations by filename with page references
 */
export function groupCitationsByFile(
  citations: ParsedCitation[]
): CitationSummary {
  const summary: CitationSummary = {};

  citations.forEach((citation) => {
    if (!summary[citation.filename]) {
      summary[citation.filename] = {
        pages: new Set<number>(),
        totalReferences: 0,
      };
    }

    if (citation.pageNumber !== null) {
      summary[citation.filename].pages.add(citation.pageNumber);
    }
    summary[citation.filename].totalReferences++;
  });

  return summary;
}

/**
 * Extract all unique page numbers from citations
 */
export function extractPageNumbers(citations: ParsedCitation[]): number[] {
  const pages = new Set<number>();

  citations.forEach((citation) => {
    if (citation.pageNumber !== null) {
      pages.add(citation.pageNumber);
    }
  });

  return Array.from(pages).sort((a, b) => a - b);
}

/**
 * Find which files are referenced in the text
 */
export function findReferencedFiles(text: string): string[] {
  const citations = parseCitations(text);
  const files = new Set<string>();

  citations.forEach((citation) => {
    files.add(citation.filename);
  });

  return Array.from(files);
}

/**
 * Create a citation link that can be used in UI
 */
export function createCitationLink(citation: ParsedCitation): string {
  if (citation.pageNumber !== null) {
    return `${citation.filename}#page=${citation.pageNumber}`;
  }
  return citation.filename;
}

/**
 * Format citation for display
 */
export function formatCitation(
  filename: string,
  pageNumber?: number | null
): string {
  if (pageNumber !== null && pageNumber !== undefined) {
    return `(${filename}, p. ${pageNumber})`;
  }
  return `(${filename})`;
}

/**
 * Validate if a citation is properly formatted
 */
export function isValidCitation(citation: string): boolean {
  const citationRegex = /\(([^,)]+\.pdf)(?:,\s*p\.\s*(\d+))?\)/;
  return citationRegex.test(citation);
}

/**
 * Convert citations to clickable links in HTML/markdown
 */
export function makeCitationsClickable(text: string): string {
  const citations = parseCitations(text);
  let result = text;

  // Sort citations by position in text (reverse order to avoid index issues)
  citations.reverse().forEach((citation) => {
    const clickableLink = `<button 
      class="text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
      onclick="citationClick('${citation.filename}', ${citation.pageNumber})"
    >
      ${citation.fullCitation}
    </button>`;

    result = result.replace(citation.fullCitation, clickableLink);
  });

  return result;
}

/**
 * Get statistics about citations in text
 */
export function getCitationStats(text: string) {
  const citations = parseCitations(text);
  const summary = groupCitationsByFile(citations);

  return {
    totalCitations: citations.length,
    uniqueFiles: Object.keys(summary).length,
    filesWithPages: Object.values(summary).filter((s) => s.pages.size > 0)
      .length,
    mostReferencedFile:
      Object.entries(summary).sort(
        ([, a], [, b]) => b.totalReferences - a.totalReferences
      )[0]?.[0] || null,
    totalUniquePages: Object.values(summary).reduce(
      (sum, s) => sum + s.pages.size,
      0
    ),
  };
}
