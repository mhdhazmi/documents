// src/app/components/ChatMessage.tsx - Updated with citation support and RTL for Arabic
"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import TypingIndicator from "./TypingIndicator";
import { ProcessedText } from "./CitationLink";

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  onCitationClick?: (filename: string, pageNumber?: number) => void;
}

// Helper function to detect if text contains Arabic
const containsArabic = (text: string): boolean => {
  return /[\u0600-\u06FF]/.test(text);
};

export default function ChatMessage({
  message,
  isUser,
  onCitationClick = () => {},
}: ChatMessageProps) {
  // Detect if message contains Arabic
  const isRTL = containsArabic(message);

  return (
    <div className={`flex justify-${isUser ? "end" : "start"} mb-4`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
          isUser
            ? "bg-emerald-600 text-white shadow-md"
            : "bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-md "
        }`}
        style={{ direction: isRTL ? "rtl" : "ltr" }}
      >
        {message === "" || message === "..." ? (
          <TypingIndicator />
        ) : (
          <div
            className={`prose prose-invert prose-sm max-w-none break-words text-md ${
              isUser ? "" : "prose-headings:text-white prose-a:text-blue-300"
            }`}
            style={{
              textAlign: isRTL ? "right" : "left",
              fontFamily: isRTL ? "'Noto Sans Arabic', sans-serif" : "inherit",
            }}
          >
            {isUser ? (
              // User messages don't need citation processing
              <ReactMarkdown>{message}</ReactMarkdown>
            ) : (
              // Bot messages need citation processing
              // Check if message appears to be an error message
              message.includes("API key") || message.includes("error") || message.includes("trouble") ? (
                <div className="flex items-center">
                  <svg className="mr-2 h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{message}</span>
                </div>
              ) : (
                <ReactMarkdown
                  components={{
                    // Custom component for text nodes to process citations
                    text: ({ children }) => (
                      <ProcessedText
                        text={children?.toString() || ""}
                        onCitationClick={onCitationClick}
                      />
                    ),
                    // Keep other markdown components as they are
                    p: ({ children }) => (
                      <p>
                        {React.Children.map(children, (child) =>
                          typeof child === "string" ? (
                            <ProcessedText
                              text={child}
                              onCitationClick={onCitationClick}
                            />
                          ) : (
                            child
                          )
                        )}
                      </p>
                    ),
                  }}
                >
                  {message}
                </ReactMarkdown>
              )
            )}
          </div>
        )}
        <p
          className="text-xs mt-1 text-emerald-200"
          style={{ textAlign: isRTL ? "left" : "right" }}
        >
          {new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}
