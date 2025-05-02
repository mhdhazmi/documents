"use client"

import React from 'react';

export default function ChatMessage({ message, isUser }: {message: string, isUser: boolean}) {
  return (
    <div className={`flex justify-${isUser ? "end" : "start"}`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${isUser?  "bg-emerald-600" : "bg-white/10 backdrop-blur-md border border-white/20"} text-white`}>
        <p className="text-right">{message}</p>
        <p className="text-xs mt-1 text-emerald-200 text-right">
          {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}