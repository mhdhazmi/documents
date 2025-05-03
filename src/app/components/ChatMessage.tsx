"use client"

import React from 'react';
import ReactMarkdown from 'react-markdown';
import TypingIndicator from './TypingIndicator';

export default function ChatMessage({ message, isUser }: {message: string, isUser: boolean}) {
  return (
    <div className={`flex justify-${isUser ? "end" : "start"} mb-4`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${isUser?  "bg-emerald-600" : "bg-white/10 backdrop-blur-md border border-white/20"} text-white text-right`}>
        {message === "" ? (
          <TypingIndicator/> 
        ) : (
          <div className={`prose prose-invert prose-sm max-w-none break-words ${isUser ? "" : "prose-headings:text-white prose-a:text-blue-300 text-right"}`}>
            <ReactMarkdown >
              {message}
            </ReactMarkdown>
          </div>
        )}
        <p className="text-xs mt-1 text-emerald-200 text-right">
          {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}