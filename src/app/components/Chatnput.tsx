"use client"
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '../../../convex/_generated/api';
import { useMutation } from 'convex/react';
import { Id } from '../../../convex/_generated/dataModel';

export default function ChatInput({ input, setInput, setMessages, sessionId }: 
  { input: string, setInput: (input: string) => void, setMessages: (messages: string[]) => void, sessionId: string }) {

  const saveMessage = useMutation(api.serve.serve.saveMessage);





  const handleSendMessage = async (): Promise<void> => {
    if (input.trim() === '') return;
    
    // Add user message to the chat
    const userMessage = input;
    
    setMessages((prevMessages: string[]) => [...prevMessages, userMessage]);
    await saveMessage({
      message: userMessage,
      sessionId: sessionId as Id<"chatSessions">,
      isUser: true,
    });
    
    setInput('');

   
  }
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    };


  return (
    <div className="relative">
      <textarea
        placeholder="اكتب سؤالك هنا..."
        className="w-full bg-white/10 text-white placeholder-white/50 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        rows={1}
        dir="rtl"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <Button
        className="absolute left-2 top-1 p-2 rounded-full bg-emerald-600 text-white"
          onClick={handleSendMessage}
          disabled={input.trim() === ''}
          >
        <Send size={18} />
      </Button>
    </div>
  );
}