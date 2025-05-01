"use client"

import React from 'react';

export default function ChatMessage({ message, isUser }: {message: string, isUser: boolean}) {
  return (
    <div className={`flex justify-${isUser ? "end" : "start"}`}>
      <div className="max-w-[80%] rounded-2xl px-4 py-2 bg-emerald-600 text-white">
        <p className="text-right">{message}</p>
        <p className="text-xs mt-1 text-emerald-200 text-right">
          12:34 PM
        </p>
      </div>
    </div>
  );
}