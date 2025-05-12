import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { X } from "lucide-react";

interface QRCodePopupProps {
  onClose: () => void;
}

export default function QRCodePopup({ onClose }: QRCodePopupProps) {
  const [isClosing, setIsClosing] = useState(false);

  // Handle QR popup closing animation
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 500); // Match animation duration
  }, [onClose]);

  // Close on escape key
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleEscKey);
    return () => window.removeEventListener("keydown", handleEscKey);
  }, [handleClose]);

  return (
    <div
      className={`hidden lg:block fixed bottom-6 left-6 bg-white/10 backdrop-blur-md shadow-lg rounded-xl p-4 border border-white/20 ${
        isClosing ? "animate-slide-out-left" : "animate-slide-in-left"
      }`}
    >
      <button
        className="absolute top-1 right-1 text-white/80 hover:text-white"
        onClick={handleClose}
        aria-label="Close QR code popup"
      >
        <X size={20} />
      </button>
      <div className="text-white text-sm mb-2 text-center pt-2">
        امسح الرمز للوصول للتطبيق
      </div>
      <div className="w-32 h-32 relative">
        <Image
          src="/qr-code.png"
          alt="QR Code"
          fill
          className="object-contain ml-2"
        />
      </div>
    </div>
  );
}
