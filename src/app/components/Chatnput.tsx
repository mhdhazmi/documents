"use client"
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { api } from '../../../convex/_generated/api';
import { useMutation } from 'convex/react';
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
    
    // Get the user message
    const userMessage = input;
    
    console.log("ChatInput: Sending message with sessionId:", sessionId);
    
    // Clear input immediately for better UX
    setInput('');
    setIsSubmitting(true);
    
    try {
      // Use Convex mutation to save the message without optimistic UI updates
      // This will trigger the answer function in serve.ts via runAfter in saveMessage
      const messageId = await saveMessage({
        message: userMessage,
        sessionId: sessionId,
        isUser: true,
      });
      
      console.log("ChatInput: Message saved successfully, ID:", messageId);
      
      // The server will handle the response processing
      // Messages will be fetched from the server directly
      
    } catch (error) {
      console.error("ChatInput: Failed to send message:", error);
      
      // Show error as a new message
      setMessages(prevMessages => [
        ...prevMessages,
        {
          id: `error-${Date.now()}`,
          text: "Sorry, there was an error sending your message. Please try again.",
          isUser: false,
          timestamp: Date.now(),
          sessionId
        }
      ]);
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