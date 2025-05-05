// src/app/pdf/[storageId]/components/GlassmorphicProgressStepper.tsx
import React from 'react';
import { CheckCircle, Clock, Loader2 } from 'lucide-react';

export type OcrStep = 'uploaded' | 'processing' | 'streaming' | 'completed';

interface GlassmorphicProgressStepperProps {
  currentStep: OcrStep;
  modelType: 'gemini' | 'replicate';
}

export default function GlassmorphicProgressStepper({ 
  currentStep, 
  modelType 
}: GlassmorphicProgressStepperProps) {
  // Define the ordered steps for display - first is rightmost in RTL
  const orderedSteps: { key: OcrStep; label: string }[] = [
    { key: 'uploaded', label: 'تحميل الملف' },
    { key: 'processing', label: 'معالجة النص' },
    { key: 'streaming', label: 'تنقيح النص' },
    { key: 'completed', label: 'اكتمل' }
  ];

  // Map the current step value to its index in our ordered steps
  const currentStepIndex = orderedSteps.findIndex(step => step.key === currentStep);
  
  // Process each step to determine its status
  const processedSteps = orderedSteps.map((step, index) => {
    // Step is completed if its index is less than current step index
    // Step is current if its index equals current step index
    // Step is pending if its index is greater than current step index
    const status = 
      index < currentStepIndex ? 'completed' :
      index === currentStepIndex ? 'current' : 'pending';
    
    // Assign the appropriate icon based on status
    const icon = 
      status === 'completed' ? <CheckCircle className="w-5 h-5 text-emerald-400" /> :
      status === 'current' ? <Loader2 className="w-5 h-5 text-white animate-spin" /> :
      <Clock className="w-5 h-5 text-white/40" />;
    
    return {
      ...step,
      status,
      icon
    };
  });

  return (
    <div className="mb-2 rounded-lg bg-emerald-950/60 backdrop-blur-md border border-emerald-800/30 shadow-lg p-2" dir="rtl">
      <div className="flex items-center justify-between px-1">
        {processedSteps.map((step, index) => (
          <React.Fragment key={step.key}>
            {/* Step with icon and label */}
            <div className="flex flex-col items-center">
              <div className={`flex items-center justify-center rounded-full w-7 h-7 
                ${step.status === 'completed' ? 'bg-emerald-600/20' : 
                step.status === 'current' ? 'bg-white/10' : 
                'bg-white/5'}`}
              >
                {step.icon}
              </div>
              <span className={`text-xs mt-1 text-center
                ${step.status === 'completed' ? 'text-emerald-400' : 
                step.status === 'current' ? 'text-white' : 
                'text-white/40'}`}
              >
                {step.label}
              </span>
            </div>
            
            {/* Connector line between steps */}
            {index < processedSteps.length - 1 && (
              <div className="h-[1px] flex-1 mx-2 bg-gradient-to-l from-emerald-500/30 to-emerald-400/20" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}