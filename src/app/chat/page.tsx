"use client"

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import ChatInput from '../components/Chatnput';
import ChatMessages from '../components/ChatMessages';
import { Trash2 } from 'lucide-react';
import Sources from '../components/Sources';
import PDFViewer from '../components/PDFViewer';
import ChatHeader from '../components/ChatHeader';
import { useRouter } from 'next/navigation';

// Polyfill for crypto.randomUUID
const generateUUID = () => {
  try {
    return crypto.randomUUID();
  } catch {
    // Fallback implementation if randomUUID is not available
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
};

export default function Chat() {
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string>('');
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const router = useRouter();

  // Initialize sessionId after component mounts to avoid SSR issues
  useEffect(() => {
    setSessionId(generateUUID());
  }, []);

  const clearChat = () => {
    setSessionId(generateUUID());
    setPdfUrl('');
    router.refresh();
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] md:h-full w-full" style={{
      backgroundImage: 'url("/background.png")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed'
    }}>
      <div className="flex flex-col md:flex-row h-auto md:h-full">
        <PDFViewer pdfUrl={pdfUrl} />
        <div className="w-full md:w-1/2 p-3 flex flex-col h-auto md:h-[95%]">
          <div className="bg-white/10 backdrop-blur-md shadow-lg rounded-2xl p-3 border border-white/20 flex-grow flex flex-col overflow-auto md:overflow-hidden max-h-[80vh] md:max-h-none">
            <ChatHeader />
            <ChatMessages sessionId={sessionId} />
            <Sources sessionId={sessionId} setPdfUrl={setPdfUrl} />
            
            <div className="flex items-center gap-2 mb-1 justify-center">
              <div className="max-w-[600px] flex-1">
                <ChatInput
                  input={input}
                  setInput={setInput}
                  setMessages={() => {}}
                  sessionId={sessionId}
                />
              </div>
              <Button 
                onClick={clearChat} 
                variant="destructive"
                size="icon"
                className="bg-emerald-950 hover:bg-emerald-600" 
                title="حذف المحادثه"
              >
                <Trash2 size={18} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

