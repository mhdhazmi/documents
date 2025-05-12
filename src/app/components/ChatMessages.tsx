// src/app/components/ChatMessages.tsx - Updated with citation support
"use client";
import { useEffect, useRef } from "react";
import ChatMessage from "./ChatMessage";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface ChatMessagesProps {
  sessionId: string;
  onCitationClick?: (filename: string, pageNumber?: number) => void;
}

export default function ChatMessages({
  sessionId,
  onCitationClick = () => {},
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const retrieveMessages = useQuery(api.serve.serve.retrieveMessages, {
    sessionId,
  });

  const messages = retrieveMessages;

  // Function to check if user is near bottom
  const isNearBottom = () => {
    if (!chatContainerRef.current) return true;

    const container = chatContainerRef.current;
    const threshold = 100; // pixels from bottom to trigger auto-scroll
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    return distanceFromBottom <= threshold;
  };

  // Scroll to bottom whenever messages change, but only if near bottom
  useEffect(() => {
    if (isNearBottom()) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <div
      ref={chatContainerRef}
      className="flex-grow overflow-y-auto mb-4 space-y-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent pr-2"
    >
      {/* Welcome message */}
      <div className="flex justify-start">
        <div className="bg-white/20 text-white rounded-2xl px-4 py-2">
          <p className="text-right">
            مرحباً! كيف يمكنني مساعدتك؟ اطرح سؤالاً وسأساعدك في العثور على
            المعلومات المناسبة من المستندات المتاحة.
          </p>
        </div>
      </div>

      {/* Messages with citation support */}
      {messages &&
        messages.map((message, index) => (
          <ChatMessage
            key={index}
            message={message.text}
            isUser={message.isUser}
            onCitationClick={onCitationClick}
          />
        ))}

      {/* Invisible element for scroll reference */}
      <div ref={messagesEndRef} />
    </div>
  );
}
