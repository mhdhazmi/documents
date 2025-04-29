'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { Send } from 'lucide-react';

export default function ChatPage() {
  const searchParams = useSearchParams();
  const pdfId = searchParams.get('pdfId');
  
  const [sessionId, setSessionId] = useState<Id<"chatSessions"> | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get PDF data
  const pdfData = useQuery(
    api.pdf.queries.getPdf,
    pdfId ? { pdfId: pdfId as Id<"pdfs"> } : 'skip'
  );

  // Get file URL
  const fileUrl = useQuery(
    api.files.queries.getFileDownloadUrl,
    pdfData?.fileId ? { fileId: pdfData.fileId } : 'skip'
  );

  // Create a chat session
  const createSession = useMutation(api.serve.serve.createSession);
  // Get messages for the current session
  const messagesResult = useQuery(
    api.serve.serve.getMessages,
    sessionId ? { sessionId } : 'skip'
  );
  const messages = useMemo(() => messagesResult || [], [messagesResult]);
  
  // Send message mutation
  const sendMessage = useMutation(api.serve.serve.send);

  // Create chat session when PDF is selected
  useEffect(() => {
    if (pdfId && !sessionId) {
      const initChat = async () => {
        try {
          console.log("Creating session for PDF:", pdfId);
          const newSessionId = await createSession({ 
            pdfId: pdfId as Id<"pdfs">,
          });
          console.log("Session created successfully:", newSessionId);
          setSessionId(newSessionId);
        } catch (error) {
          console.error("Failed to create chat session:", error);
          // You could show an error message to the user here
        }
      };
      void initChat();
    }
  }, [pdfId, sessionId, createSession]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !sessionId) return;
    
    await sendMessage({ 
      message: messageInput, 
      sessionId 
    });
    
    setMessageInput('');
  };

  // Handle pressing Enter to send message
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  // Determine if the assistant is currently "typing"
  const isTyping = messages.length > 0 && 
    messages[messages.length - 1].isUser === false && 
    messages[messages.length - 1].text === "";

  return (
    <div 
      className="flex flex-col md:flex-row h-screen"
      style={{
        backgroundImage: 'url("/background.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* PDF Viewer - Left Side */}
      <div className="w-full md:w-1/2 p-4 h-full">
        <div className="bg-white/10 backdrop-blur-md shadow-lg rounded-2xl p-2 border border-white/20 h-full">
          {fileUrl ? (
            <iframe
              src={fileUrl}
              title="PDF Viewer"
              width="100%"
              height="100%"
              style={{ border: 'none', borderRadius: '12px' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white">
              <p className="text-center">اختر ملف PDF للمحادثة معه</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat UI - Right Side */}
      <div className="w-full md:w-1/2 p-4 h-full flex flex-col">
        <div className="bg-white/10 backdrop-blur-md shadow-lg rounded-2xl p-4 border border-white/20 flex-grow flex flex-col overflow-hidden">
          {/* Chat header */}
          <div className="mb-4 text-right">
            <h2 className="text-2xl font-semibold text-white">المحادثة</h2>
            <p className="text-white/70 text-sm">
              {pdfData?.filename ? `تحدث مع: ${pdfData.filename}` : 'اختر ملف للمحادثة معه'}
            </p>
          </div>

          {/* Messages container */}
          <div className="flex-grow overflow-y-auto mb-4 space-y-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent pr-2">
            {/* Welcome message if no messages yet */}
            {messages.length === 0 && (
              <div className="flex justify-start">
                <div className="bg-white/20 text-white rounded-2xl px-4 py-2">
                  <p className="text-right">مرحباً! كيف يمكنني مساعدتك بخصوص هذا المستند؟</p>
                </div>
              </div>
            )}
            
            {/* Actual messages */}
            {messages.map((message) => (
              <div 
                key={message._id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    message.isUser 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-white/20 text-white'
                  }`}
                >
                  <p className="text-right">{message.text}</p>
                  <p className={`text-xs mt-1 ${message.isUser ? 'text-emerald-200' : 'text-white/60'} text-right`}>
                    {new Date(message.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            
            {/* "Typing" indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white/20 text-white rounded-2xl px-4 py-2">
                  <div className="flex space-x-2 rtl:space-x-reverse">
                    <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Invisible element to scroll to */}
            <div ref={messagesEndRef} />
          </div>

          {/* Message input */}
          <div className="relative">
            <textarea
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اكتب رسالتك هنا..."
              className="w-full bg-white/10 text-white placeholder-white/50 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              rows={2}
              dir="rtl"
              disabled={!sessionId}
            />
            <button
              onClick={() => void handleSendMessage()}
              disabled={!messageInput.trim() || !sessionId || isTyping}
              className={`absolute left-2 bottom-3 p-2 rounded-full ${
                messageInput.trim() && sessionId && !isTyping
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white/20 text-white/50'
              }`}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}