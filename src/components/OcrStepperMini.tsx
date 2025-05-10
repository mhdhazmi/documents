// components/ocr/OcrStepperMini.tsx
import { cn } from "@/lib/utils";
import { getStatusColor } from "@/lib/ocrColors";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type OcrStatus = "pending" | "processing" | "completed" | "failed";

interface OcrStepperMiniProps {
  provider: "gemini" | "replicate";
  status: OcrStatus;
}

export function OcrStepperMini({ provider, status }: OcrStepperMiniProps) {
  const statusColor = getStatusColor(status);
  const label = `${provider} • ${status}`;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn("h-4 px-2 rounded-full", statusColor)}
            aria-label={label}
          />
        </TooltipTrigger>
        <TooltipContent>
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}