"use client"
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

export default function ChatMessages({  sessionId }: {  sessionId: string }) {


  const retrieveMessages = useQuery(api.serve.serve.retrieveMessages, { sessionId: sessionId });


  const messages = retrieveMessages;
  
  return (
    <div className="flex-grow overflow-y-auto mb-4 space-y-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent pr-2">
      {/* Welcome message */}
      <div className="flex justify-start">
        <div className="bg-white/20 text-white rounded-2xl px-4 py-2">
          <p className="text-right">مرحباً! كيف يمكنني مساعدتك؟ اطرح سؤالاً وسأساعدك في العثور على المعلومات المناسبة من المستندات المتاحة.</p>
        </div>
      </div>
      
      {/* Sample messages */}
      {messages && messages.map((message, index) => (
        <ChatMessage key={index} message={message.text} isUser={message.isUser} />
      ))}
      <TypingIndicator />
      
      {/* Invisible element for scroll reference */}
      <div />
    </div>
  );
}