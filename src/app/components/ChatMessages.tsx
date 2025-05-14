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

  // Track if user is manually scrolling
  const userIsScrolling = useRef(false);
  const lastScrollTop = useRef(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to check if user is near bottom
  const isNearBottom = () => {
    if (!chatContainerRef.current) return true;

    const container = chatContainerRef.current;
    const threshold = 100; // pixels from bottom to trigger auto-scroll
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    return distanceFromBottom <= threshold;
  };

  // Set up scroll event listeners
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (!container) return;
      
      // If user is manually scrolling upward, disable auto-scroll temporarily
      if (container.scrollTop < lastScrollTop.current) {
        userIsScrolling.current = true;
        
        // Reset the user scrolling flag after user stops scrolling for 2 seconds
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        
        scrollTimeoutRef.current = setTimeout(() => {
          userIsScrolling.current = false;
        }, 2000);
      }
      
      lastScrollTop.current = container.scrollTop;
      
      // If user scrolls to bottom, re-enable auto-scroll
      if (isNearBottom()) {
        userIsScrolling.current = false;
      }
    };

    container.addEventListener("scroll", handleScroll);
    
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Scroll to bottom when new messages arrive, but respect user scrolling
  useEffect(() => {
    // Only auto-scroll if:
    // 1. User is not actively scrolling upward AND
    // 2. User is already near the bottom OR this is the first load
    if (!userIsScrolling.current && (isNearBottom() || !messages?.length)) {
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
