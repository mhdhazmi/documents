"use client"
import React, { useEffect, useRef, useState } from 'react';
import PDFViewer from '../components/PDFViewer';
import ChatContainer from '../components/ChatContainer';
import ChatHeader from '../components/ChatHeader';
import ChatMessages from '../components/ChatMessages';
import ChatInput from '../components/Chatnput';
import { Button } from '@/components/ui/button';
import { api } from '../../../convex/_generated/api';
import { useMutation } from 'convex/react';


export default function ChatPage() {


const saveSessionId = useMutation(api.serve.serve.saveSessionId);



const [pdfUrl, setPdfUrl] = useState<string>('');
const [messages, setMessages] = useState<string[]>([]);
const [input, setInput] = useState<string>('');
const [isTyping, setIsTyping] = useState<boolean>(false);
const [isLoading, setIsLoading] = useState<boolean>(false);
const messagesEndRef = useRef<HTMLDivElement>(null);
const [sessionId, setSessionId] = useState<string | null>(
  () => localStorage.getItem('sessionId')
);



useEffect(() => {
  // Only fire if nothing was in storage
  if (!sessionId) {
    const newId = crypto.randomUUID();
    saveSessionId({ sessionId: newId });
    setSessionId(newId);
    localStorage.setItem('sessionId', newId);
  }
  const savedMessages = localStorage.getItem('chatMessages');
  if (savedMessages) {
    setMessages(JSON.parse(savedMessages));
  }
}, [sessionId]);

useEffect(() => {
  localStorage.setItem('chatMessages', JSON.stringify(messages));
}, [messages]);



const clearChat = (): void => {
  setMessages([]);
  localStorage.removeItem('chatMessages');
  localStorage.removeItem('sessionId');
};

  return (
    
    <div 
      className="flex flex-col md:flex-row h-screen"
      style={{
        backgroundImage: 'url("/background.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <PDFViewer pdfUrl={pdfUrl} /> 
      <div className="w-full md:w-1/2 p-4 h-full flex flex-col">
      <div className="bg-white/10 backdrop-blur-md shadow-lg rounded-2xl p-4 border border-white/20 flex-grow flex flex-col overflow-hidden">
        <ChatHeader />
        <ChatMessages sessionId = {sessionId as string}/>
        <ChatInput input={input} setInput={setInput} setMessages={setMessages} sessionId ={sessionId as string}/>
        <Button onClick={clearChat} className="mt-4 bg-red-500 text-white px-4 py-2 rounded-md w-1"/>
      </div>
    </div>
    </div>
  );
}

