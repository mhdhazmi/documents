"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquareText } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface ChatWithDocumentPopupProps {
  pdfId: string | Id<"pdfs">;
  show: boolean;
}

export default function ChatWithDocumentPopup({ pdfId, show }: ChatWithDocumentPopupProps) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  
  // We don't actually need to use the PDF data here anymore
  // We're just storing the ID in localStorage and navigating to the chat page
  // The chat page will retrieve the proper file ID for the PDF
  useQuery(api.pdf.queries.getPdf, {
    pdfId: pdfId as Id<"pdfs">,
  });
  
  // Only delay appearance slightly for better UX
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 800); // Reduced delay for faster appearance
      
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [show]);
  
  const handleClick = () => {
    try {
      // Store the PDF ID in localStorage to retrieve it in the chat page
      // This avoids URL parameter issues with different ID types
      if (typeof window !== 'undefined') {
        localStorage.setItem('lastViewedPdfId', pdfId.toString());
      }
      
      // Navigate to chat page without parameters
      router.push('/chat');
    } catch (error) {
      console.error("Error saving PDF ID:", error);
      router.push('/chat');
    }
  };
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-6 right-6 z-50"
        >
          <button
            onClick={handleClick}
            className="flex items-center gap-2 px-5 py-3.5 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-full shadow-lg backdrop-blur-sm border border-emerald-500/50 transition-all duration-200 group animate-pulse hover:animate-none"
          >
            <MessageSquareText size={20} className="group-hover:animate-bounce" />
            <span className="font-medium text-base">Chat with this document</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}