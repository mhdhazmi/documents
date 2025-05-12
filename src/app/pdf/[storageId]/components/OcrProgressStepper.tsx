// src/app/pdf/[storageId]/components/OcrProgressStepper.tsx
import React from "react";
import { CheckCircle, Clock, Loader2 } from "lucide-react";

export type OcrStep = "uploaded" | "processing" | "streaming" | "completed";

interface OcrStepInfo {
  key: OcrStep;
  label: string;
  icon: React.ReactNode;
  status: "completed" | "current" | "pending";
}

interface OcrProgressStepperProps {
  currentStep: OcrStep;
  modelType: "gemini" | "replicate";
}

export default function OcrProgressStepper({
  currentStep,
  modelType,
}: OcrProgressStepperProps) {
  // Define steps for the OCR process
  const steps: Record<OcrStep, string> = {
    uploaded: "تم رفع الملف",
    processing: "جاري معالجة النص",
    streaming: "جاري تحسين النص",
    completed: "اكتمل",
  };

  // Create the step information array with status
  const stepInfo: OcrStepInfo[] = Object.entries(steps).map(([key, label]) => {
    let status: "completed" | "current" | "pending";

    if (key === currentStep) {
      status = "current";
    } else if (
      (key === "uploaded" &&
        ["processing", "streaming", "completed"].includes(currentStep)) ||
      (key === "processing" &&
        ["streaming", "completed"].includes(currentStep)) ||
      (key === "streaming" && currentStep === "completed")
    ) {
      status = "completed";
    } else {
      status = "pending";
    }

    return {
      key: key as OcrStep,
      label,
      status,
      icon:
        status === "completed" ? (
          <CheckCircle className="w-6 h-6 text-green-500" />
        ) : status === "current" ? (
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        ) : (
          <Clock className="w-6 h-6 text-white/40" />
        ),
    };
  });

  // Colors for model type
  const colorClasses = {
    gemini: "from-blue-600 to-blue-800", // Blue for Gemini
    replicate: "from-purple-600 to-purple-800", // Purple for Replicate
  };

  return (
    <div className="mb-4">
      <div
        className={`rounded-lg border border-white/20 p-3 bg-gradient-to-r ${colorClasses[modelType]} backdrop-blur-md shadow-lg`}
      >
        <h3 className="text-base font-medium mb-3 text-white text-right">
          {modelType === "gemini"
            ? "نموذج مغلق المصدر (جيميني)"
            : "نموذج مفتوح المصدر (ريبليكت)"}
        </h3>

        <div className="flex items-center justify-between">
          {stepInfo.map((step, index) => (
            <React.Fragment key={step.key}>
              {/* Step circle with icon */}
              <div className="flex flex-col items-center">
                <div
                  className={`rounded-full w-10 h-10 flex items-center justify-center border-2 ${
                    step.status === "completed"
                      ? "border-green-500 bg-green-500/20"
                      : step.status === "current"
                        ? "border-white bg-white/20"
                        : "border-white/40 bg-white/10"
                  }`}
                >
                  {step.icon}
                </div>
                <span
                  className={`text-xs mt-1 whitespace-nowrap ${
                    step.status === "completed"
                      ? "text-green-300"
                      : step.status === "current"
                        ? "text-white"
                        : "text-white/40"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line between steps */}
              {index < stepInfo.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-1 ${
                    stepInfo[index + 1].status === "completed" ||
                    (stepInfo[index].status === "completed" &&
                      stepInfo[index + 1].status === "current")
                      ? "bg-green-500"
                      : "bg-white/30"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
