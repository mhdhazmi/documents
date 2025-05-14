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
          animate={{ 
            opacity: 1, 
            y: [0, -10, 0], 
            scale: 1,
            transition: { 
              opacity: { duration: 0.3, ease: "easeOut" },
              y: { duration: 4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" },
              scale: { duration: 0.3, ease: "easeOut" }
            }
          }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          className="fixed bottom-8 right-8 z-50"
        >
          <button
            onClick={handleClick}
            className="relative flex items-center justify-center w-16 h-16 bg-emerald-900 hover:bg-emerald-500 text-white rounded-full shadow-lg backdrop-blur-sm border border-emerald-400/30 transition-all duration-300 hover:scale-110 hover:shadow-emerald-500/30 hover:shadow-xl"
            title="Chat with this document"
          >
            {/* Add glow effect behind the icon */}
            <div className="absolute w-10 h-10 bg-emerald-400/20 rounded-full blur-md"></div>
            <MessageSquareText size={24} className="text-white relative z-10" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}