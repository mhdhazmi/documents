"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import ChatInput from '../components/Chatnput';
import ChatMessages from '../components/ChatMessages';
import { Trash2 } from 'lucide-react';
import Sources from '../components/Sources';
import PDFViewer from '../components/PDFViewer';
import ChatHeader from '../components/ChatHeader';
import { useRouter } from 'next/navigation';

export default function Chat() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string>(crypto.randomUUID());
  const [pdfUrl, setPdfUrl] = useState<string | null>();
  const router = useRouter();

  const clearChat = () => {
    setMessages([]);
    setSessionId(crypto.randomUUID());
    setPdfUrl(null);
    router.refresh();
  };

  return (
    <div className="min-h-screen w-full" style={{
      backgroundImage: 'url("/background.png")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed'
    }}>
      <div className="flex flex-col md:flex-row h-[97vh] pb-8">
        <PDFViewer pdfUrl={pdfUrl} />
        <div className="w-full md:w-1/2 p-4 h-full flex flex-col">
          <div className="bg-white/10 backdrop-blur-md shadow-lg rounded-2xl p-4 border border-white/20 flex-grow flex flex-col overflow-hidden">
            <ChatHeader />
            <ChatMessages sessionId={sessionId} />
            <Sources sessionId={sessionId} setPdfUrl={setPdfUrl} />
            {/* <ChatInput
                  input={input}
                  setInput={setInput}
                  setMessages={setMessages}
                  sessionId={sessionId}
                /> */}
            <div className="flex items-center gap-2 mb-1">
              <div className="max-w-[600px] flex-1">
                <ChatInput
                  input={input}
                  setInput={setInput}
                  setMessages={setMessages}
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

