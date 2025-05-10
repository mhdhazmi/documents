// /components/ocr/OcrStepperMini.tsx
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type OcrStatus = "pending" | "processing" | "completed" | "failed";

interface OcrStepperMiniProps {
  provider: "gemini" | "replicate";
  status: OcrStatus;
}

const statusColors = {
  pending: "bg-muted/30",
  processing: "bg-yellow-400/80",
  completed: "bg-emerald-500/90",
  failed: "bg-destructive"
};

export default function OcrStepperMini({ provider, status }: OcrStepperMiniProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span 
            className={cn("h-4 px-2 rounded-full", statusColors[status])}
            aria-label={`${provider} OCR status: ${status}`}
          />
        </TooltipTrigger>
        <TooltipContent>
          {provider.charAt(0).toUpperCase() + provider.slice(1)} • {status}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}