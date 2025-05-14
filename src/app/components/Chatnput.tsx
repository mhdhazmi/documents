"use client"
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { api } from '../../../convex/_generated/api';
import { useMutation } from 'convex/react';
import { Id } from '../../../convex/_generated/dataModel';
import { ChangeEvent, KeyboardEvent, useState } from 'react';

export default function ChatInput({ input, setInput, setMessages, sessionId }: 
  { 
    input: string, 
    setInput: (input: string) => void, 
    setMessages: React.Dispatch<React.SetStateAction<{ id: string; text: string; isUser: boolean; timestamp: number; sessionId: string }[]>>, 
    sessionId: string 
  }) {

  const saveMessage = useMutation(api.serve.serve.saveMessage);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendMessage = async (): Promise<void> => {
    if (input.trim() === '' || isSubmitting) return;
    
    // Add user message to the chat optimistically
    const userMessage = input;
    const timestamp = Date.now();
    
    // Show optimistic update immediately
    setMessages(prevMessages => [
      ...prevMessages, 
      { 
        id: `temp-${timestamp}`,
        text: userMessage, 
        isUser: true,
        timestamp: timestamp,
        sessionId
      }
    ]);
    
    // Add empty assistant message with loading state
    setMessages(prevMessages => [
      ...prevMessages,
      {
        id: `temp-assistant-${timestamp}`,
        text: "",
        isUser: false,
        timestamp: timestamp + 1,
        sessionId
      }
    ]);
    
    // Clear input immediately for better UX
    setInput('');
    setIsSubmitting(true);
    
    try {
      // Send to server
      await saveMessage({
        message: userMessage,
        sessionId: sessionId as Id<"chatSessions">,
        isUser: true,
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      // Could add error handling here if needed
    } finally {
      setIsSubmitting(false);
    }
  };
    
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="w-full relative">
      <Textarea
        placeholder="اكتب سؤالك هنا..."
        className="w-full bg-white/10 text-white placeholder-white/50 rounded-xl pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px] py-2 resize-none"
        dir="rtl"
        value={input}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={3}
        disabled={isSubmitting}
      />
      <div className="absolute left-3 inset-y-0 flex items-center">
        <Button variant="ghost"
          className="p-1.5 rounded-full bg-emerald-600 text-white h-8 w-8 flex items-center justify-center"
          onClick={handleSendMessage}
          disabled={input.trim() === '' || isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Send size={15} />
          )}
        </Button>
      </div>
    </div>
  );
}