import React from 'react';

export default function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-white/20 text-white rounded-2xl px-4 py-2">
        <div className="flex space-x-2 rtl:space-x-reverse">
          <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}