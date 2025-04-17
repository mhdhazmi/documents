"use client";

import { useState } from "react";
import ConfirmationModal from "./ConfirmationModal";

interface UploadButtonProps {
  selectedPDF: File | null;
  isLoading: boolean;
  onSubmit?: () => void;
}

export default function UploadButton({ 
  selectedPDF, 
  isLoading, 
  onSubmit 
}: UploadButtonProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (selectedPDF && !isLoading) {
      setShowConfirmModal(true);
    }
  };
  
  const handleConfirm = () => {
    setShowConfirmModal(false);
    if (onSubmit) {
      onSubmit();
    }
  };
  
  const handleCancel = () => {
    setShowConfirmModal(false);
  };
  
  return (
    <>
      <button
        type="button"
        className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed w-full transition-colors border border-white/30 mt-7"
        disabled={selectedPDF === null || isLoading}
        onClick={handleClick}
      >
        {isLoading ? 'يتم التحميل...' : 'ارفع الملف'}
      </button>
      
      <ConfirmationModal
        isOpen={showConfirmModal}
        title="Confirm PDF Upload"
        message="أتعهد بعدم رفع أو مشاركة أي ملفات قد تحتوي على معلومات سريه وقد تعرض هذه الوزارة لأضرارا كبيرة"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
} 