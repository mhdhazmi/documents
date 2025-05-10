// lib/ocrColors.ts
type OcrStatus = "pending" | "processing" | "completed" | "failed";

export function getStatusColor(status: OcrStatus): string {
  const statusColors = {
    pending: "bg-muted/30", // gray 300
    processing: "bg-yellow-400/80",
    completed: "bg-emerald-500/90",
    failed: "bg-destructive", // rose-600
  };
  
  return statusColors[status] || statusColors.pending;
}