"use client";

import { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

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
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  
  // Focus trap when modal opens
  useEffect(() => {
    if (isOpen && cancelButtonRef.current) {
      cancelButtonRef.current.focus();
    }
    
    // Prevent body scrolling when modal is open
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;
  
  // Only render with createPortal on the client side
  if (typeof window === 'undefined') return null;
  
  // Use createPortal to ensure the modal is rendered at the root level of the DOM
  // and isn't affected by parent positioning
  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center z-[9999]">
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      
      {/* Modal content */}
      <div 
        className="relative my-8 mx-auto w-full max-w-md rounded-2xl bg-emerald-950/100 backdrop-blur-md border border-white/20 p-6 text-white shadow-xl z-10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <h3 id="modal-title" className="text-lg font-medium mb-2 text-right">{title}</h3>
        <p className="text-sm text-white/80 mb-6 text-right">{message}</p>
        
        {/* Button container with RTL support */}
        <div className="flex justify-end items-center space-x-reverse space-x-3" dir="rtl">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-white bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-400/70 transition-colors"
            onClick={onConfirm}
          >
            تأكيد
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium bg-white/10 border border-white/30 rounded-lg hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-400/70 transition-colors"
            onClick={onCancel}
            ref={cancelButtonRef}
          >
            الرجوع  
          </button>
        </div>
      </div>
    </div>,
    // Render the modal at the document body level
    document.body
  );
}