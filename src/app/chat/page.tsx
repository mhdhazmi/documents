'use client'

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { Send } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export default function ChatPage() {
  const searchParams = useSearchParams();
  const pdfId = searchParams.get('pdfId');
  
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'مرحباً! كيف يمكنني مساعدتك بخصوص هذا المستند؟',
      isUser: false,
      timestamp: new Date(),
    }
  ]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Get PDF data if pdfId is provided
  const pdfData = useQuery(
    api.pdf.queries.getPdf,
    pdfId ? { pdfId: pdfId as Id<"pdfs"> } : 'skip'
  );

  // Get file URL if fileId is available
  const fileUrl = useQuery(
    api.files.queries.getFileDownloadUrl,
    pdfData?.fileId ? { fileId: pdfData.fileId } : 'skip'
  );

  // Set the URL when available
  useEffect(() => {
    if (fileUrl) {
      setPdfUrl(fileUrl);
    }
  }, [fileUrl]);

  // Function to handle sending a message
  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageInput,
      isUser: true,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setMessageInput('');
    setIsLoading(true);

    // Simulate AI response after a short delay
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'هذه إجابة افتراضية. سيتم استبدالها بوظيفة الدردشة الحقيقية في المستقبل.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1500);
  };

  // Handle pressing Enter to send message
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

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
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
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
            {messages.map((message) => (
              <div 
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    message.isUser 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-white/20 text-white'
                  }`}
                >
                  <p className="text-right">{message.content}</p>
                  <p className={`text-xs mt-1 ${message.isUser ? 'text-emerald-200' : 'text-white/60'} text-right`}>
                    {message.timestamp.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
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
          </div>

          {/* Message input */}
          <div className="relative">
            <textarea
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDownf
              placeholder="اكتب رسالتك هنا..."
              className="w-full bg-white/10 text-white placeholder-white/50 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              rows={2}
              dir="rtl"
            />
            <button
              onClick={handleSendMessage}
              disabled={!messageInput.trim() || isLoading}
              className={`absolute left-2 bottom-3 p-2 rounded-full ${
                messageInput.trim() && !isLoading
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