// src/app/pdf/[storageId]/components/MinimalistProgressBar.tsx
import React from 'react';
import { OcrStep } from './OcrProgressStepper';

interface MinimalistProgressBarProps {
  currentStep: OcrStep;
  modelType: 'gemini' | 'replicate';
}

export default function MinimalistProgressBar({ currentStep, modelType }: MinimalistProgressBarProps) {
  // Define steps and their order
  const stepOrder: OcrStep[] = ['uploaded', 'processing', 'streaming', 'completed'];
  
  // Calculate progress percentage based on current step
  const currentIndex = stepOrder.indexOf(currentStep);
  const totalSteps = stepOrder.length;
  const progressPercentage = ((currentIndex + 1) / totalSteps) * 100;
  
  // Define model-specific styles
  const colorClasses = {
    gemini: 'bg-blue-500',
    replicate: 'bg-purple-500'
  };

  return (
    <div className="absolute top-0 left-0 right-0 h-1.5 overflow-hidden rounded-t-lg">
      <div className="w-full h-full bg-white/10"></div>
      <div 
        className={`absolute top-0 left-0 h-full transition-all duration-700 ease-in-out ${colorClasses[modelType]}`}
        style={{ width: `${progressPercentage}%` }}
      ></div>
    </div>
  );
}