// src/app/components/ChatMessages.tsx - Updated with citation support and optimistic UI
"use client";
import { useEffect, useRef, useCallback } from "react";
import ChatMessage from "./ChatMessage";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: number;
  sessionId: string;
}

interface ChatMessagesProps {
  sessionId: string;
  messages?: ChatMessage[];
  onCitationClick?: (filename: string, pageNumber?: number) => void;
}

export default function ChatMessages({
  sessionId,
  messages: propMessages,
  onCitationClick = () => {},
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Fallback to server messages if no prop messages are provided
  const retrieveMessages = useQuery(api.serve.serve.retrieveMessages, {
    sessionId, 
  });

  // Log for debugging
  useEffect(() => {
    console.log("ChatMessages: useQuery retrieveMessages called with sessionId:", sessionId);
    console.log("ChatMessages: retrieveMessages result:", retrieveMessages?.length || 0, "messages");
    console.log("ChatMessages: propMessages:", propMessages?.length || 0, "messages");
  }, [retrieveMessages, propMessages, sessionId]);

  // Ensure we're getting the latest messages data
  const messages = propMessages || retrieveMessages;
  
  // Add more explicit logging to help diagnose rendering issues
  useEffect(() => {
    if (messages) {
      console.log("ChatMessages: Final messages array used for rendering:", 
        messages.length, 
        "messages, first message:", 
        messages.length > 0 ? messages[0].text.substring(0, 30) + "..." : "none");
    }
  }, [messages]);
  

  // Track if user is manually scrolling
  const userIsScrolling = useRef(false);
  const lastScrollTop = useRef(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to check if user is near bottom - wrapped in useCallback to avoid dependency changes
  const isNearBottom = useCallback(() => {
    if (!chatContainerRef.current) return true;

    const container = chatContainerRef.current;
    const threshold = 100; // pixels from bottom to trigger auto-scroll
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    return distanceFromBottom <= threshold;
  }, [chatContainerRef]);

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
  }, [isNearBottom]);

  // Scroll to bottom only when new messages arrive (not on every render)
  // Use a ref to track previous message count to determine if new messages were added
  const prevMessageCountRef = useRef(0);
  const isInitialLoad = useRef(true);
  
  // Scroll handler effect
  useEffect(() => {
    if (!messages) return;
    
    const currentMessageCount = messages.length;
    const hasNewMessages = currentMessageCount > prevMessageCountRef.current;
    
    // Skip auto-scroll on initial load
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      prevMessageCountRef.current = currentMessageCount;
      return;
    }
    
    // Check if near bottom using the memoized function
    const shouldScroll = isNearBottom();
    
    // Only auto-scroll if:
    // 1. There are actual new messages (not just re-renders)
    // 2. User is not actively scrolling upward AND
    // 3. User is already near the bottom
    if (hasNewMessages && !userIsScrolling.current && shouldScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    
    // Update the previous message count
    prevMessageCountRef.current = currentMessageCount;
  }, [messages, isNearBottom]); // All dependencies are now properly accounted for

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
        messages.map((message, index) => {
          let messageText = message.text;
          
          // Handle empty messages from AI (loading state)
          if (!message.isUser && (!messageText || messageText.trim() === "")) {
            messageText = "...";
          }
          
          // Check if a message has been stuck in loading state for too long (over 15 seconds)
          const messageAge = Date.now() - message.timestamp;
          if (!message.isUser && messageText === "..." && messageAge > 15000) {
            messageText = "There appears to be an issue with the AI response. This might be due to an API problem or server issue. Please try again later.";
          }
            
          return (
            <ChatMessage
              key={index}
              message={messageText}
              isUser={message.isUser}
              onCitationClick={onCitationClick}
            />
          );
        })}

      {/* Invisible element for scroll reference */}
      <div ref={messagesEndRef} />
    </div>
  );
}
