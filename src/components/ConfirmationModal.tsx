"use client";

import { useRef } from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel
}: ConfirmationModalProps) {
  const cancelButtonRef = useRef(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-emerald-950/100 backdrop-blur-md border border-white/20 rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl text-white">
        <h3 className="text-lg font-medium mb-2">{title}</h3>
        <p className="text-sm text-white/80 mb-4 text-right">{message}</p>
        
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium bg-white/10 border border-white/30 rounded-lg hover:bg-white/20 transition-colors"
            onClick={onCancel}
            ref={cancelButtonRef}
          >
            الرجوع  
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-white bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg hover:bg-white/30 transition-colors"
            onClick={onConfirm}
          >
            تأكيد
          </button>
        </div>
      </div>
    </div>
  );
} 