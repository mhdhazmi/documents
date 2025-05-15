"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useRouter } from "next/navigation";
import PDFDropzone from "@/components/PDFDropzone";
import UploadButton from "@/components/UploadButton";
import { MessageCircleMore } from "lucide-react";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import QRCodePopup from "@/components/QRCodePopup";
import RecentPdfsList from "@/components/RecentPdfsList";

// Define types for our mutation functions to avoid 'any'
type GenerateUploadUrlFn = () => Promise<string>;
type SendPDFFn = (args: {
  fileId: string;
  filename: string;
  fileSize: number;
  pageCount: number;
}) => Promise<string>;

const words = "الإدارة العامة للذكاء الإصطناعي وتطوير الأعمال";
function TextGenerateEffectDemo() {
  return <TextGenerateEffect words={words} />;
}

export default function App() {
  const router = useRouter();
  const generateUploadUrl = useMutation(api.files.mutations.generateUploadUrl);
  const sendPDF = useMutation(api.pdf.mutations.savePdfMetadata);
  // const processWithMultipleOcrMutation = useMutation(api.ocr.actions.processWithMultipleOcrMutation);

  const [selectedPDF, setSelectedPDF] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [showQRPopup, setShowQRPopup] = useState(true);

  // Handle redirection using useEffect
  useEffect(() => {
    if (redirectUrl) {
      router.push(redirectUrl);
    }
  }, [redirectUrl, router]);

  async function handleFormSubmit() {
    if (!selectedPDF) return;

    setIsLoading(true);
    try {
      // Generate upload URL and upload the PDF
      const postUrl = await (
        generateUploadUrl as unknown as GenerateUploadUrlFn
      )();

      // Upload the file to storage
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": selectedPDF.type },
        body: selectedPDF,
      });
      const { storageId } = await result.json();

      // Save PDF metadata
      const pdfId = await (sendPDF as unknown as SendPDFFn)({
        fileId: storageId,
        filename: selectedPDF.name,
        fileSize: selectedPDF.size,
        pageCount: pageCount || 0,
      });

      // Reset form state
      setSelectedPDF(null);
      setPageCount(null);

      // Start OCR processing in the background
      // await (workflowOrchMutation as unknown as ProcessPDFFn)({ pdfId }).catch(
      //   (error) => console.error("Error processing OCR:", error)
      // );

      // Set redirection URL to trigger navigation
      setRedirectUrl(`/pdf/${pdfId}/pages`);
      setIsLoading(false);
    } catch (error) {
      console.error("Error uploading PDF:", error);
      setIsLoading(false);
    }
  }

  // Handle chat card click to navigate to chat page
  const handleChatCardClick = async () => {
    // If there's a selected PDF, upload it first and then navigate to chat
    router.push("/chat");
  };

  return (
    <div
      className="flex flex-col min-h-screen overflow-auto relative"
      style={{
        backgroundImage: 'url("/background.png")',
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Main cards section */}
      <div className="flex flex-col md:flex-row justify-center items-center gap-6 py-20 flex-grow">
        <section className="w-[300px] bg-white/10 backdrop-blur-md shadow-lg rounded-2xl p-6 border border-white/20 h-[400px] text-white hover:bg-white/20 transition-colors cursor-pointer">
          <h2 className="text-3xl font-semibold mb-4 text-right">
            ارفع مستنداتك
          </h2>
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <PDFDropzone
              selectedPDF={selectedPDF}
              setSelectedPDF={setSelectedPDF}
              pageCount={pageCount}
              setPageCount={setPageCount}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />

            <UploadButton
              selectedPDF={selectedPDF}
              isLoading={isLoading}
              onSubmit={handleFormSubmit}
            />
          </form>
        </section>

        {/* Gold AI card */}
        <section
          className="w-[300px] h-[400px] shadow-lg rounded-2xl p-6 border border-amber-400 h-100 flex flex-col items-center justify-center"
          style={{
            background: "linear-gradient(145deg, #d4af37 10%, #b8860b 40%)",
            boxShadow: "0 10px 25px -5px rgba(180, 130, 20, 0.5)",
          }}
        >
          <TextGenerateEffectDemo />

          <p className="text-white font-medium text-center">
            تحويل المستندات إلى نصوص عن طريق الذكاء الإصطناعي
          </p>
        </section>

        {/* Chat card with onClick handler */}
        <section
          className="w-[300px] h-[400px] flex flex-col bg-white/10 backdrop-blur-md shadow-lg rounded-2xl p-6 border border-white/20 text-white hover:bg-white/20 transition-colors cursor-pointer"
          onClick={handleChatCardClick}
        >
          <div>
            <h2 className="text-3xl font-semibold mb-4 text-right">
              تحدث مع مستنداتك
            </h2>
            <p className="text-white/80 text-right">
              تحدث مع مستنداتك بأسهل طريقة
            </p>
          </div>
          {/* Chat icon from Lucide */}
          <div className="flex-1 flex justify-center items-center w-full">
            <MessageCircleMore className="w-40 h-40 text-white/80" />
          </div>
        </section>
      </div>

      {/* Recent PDFs section */}
      <div className="mt-auto pt-12 pb-12 backdrop-blur-sm bg-black/20">
        <RecentPdfsList />
      </div>

      {/* QR Code Popup Component */}
      {showQRPopup && <QRCodePopup onClose={() => setShowQRPopup(false)} />}
    </div>
  );
}
