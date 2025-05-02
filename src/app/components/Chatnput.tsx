"use client"
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { api } from '../../../convex/_generated/api';
import { useMutation } from 'convex/react';
import { Id } from '../../../convex/_generated/dataModel';
import { ChangeEvent, KeyboardEvent } from 'react';

export default function ChatInput({ input, setInput, setMessages, sessionId }: 
  { 
    input: string, 
    setInput: (input: string) => void, 
    setMessages: React.Dispatch<React.SetStateAction<string[]>>, 
    sessionId: string 
  }) {

  const saveMessage = useMutation(api.serve.serve.saveMessage);

  const handleSendMessage = async (): Promise<void> => {
    if (input.trim() === '') return;
    
    // Add user message to the chat
    const userMessage = input;
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    await saveMessage({
      message: userMessage,
      sessionId: sessionId as Id<"chatSessions">,
      isUser: true,
    });
    
    setInput('');
  }
    
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
      />
      <div className="absolute left-3 inset-y-0 flex items-center">
        <Button variant="ghost"
          className="p-1.5 rounded-full bg-emerald-600 text-white h-8 w-8 flex items-center justify-center"
          onClick={handleSendMessage}
          disabled={input.trim() === ''}
        >
          <Send size={15} />
        </Button>
      </div>
    </div>
  );
}