
import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Maximize2, Minimize2, Send, Brain, Zap, Star, ChevronUp, Globe, Gauge } from 'lucide-react';
import { generateStrategyResponse, AIModelMode } from '../services/gemini';
import { Message, Annotation } from '../types';
import ReactMarkdown from 'react-markdown';

interface GlobalIntelAgentProps {
  driveUrl: string;
  evidenceMap: Record<string, Annotation[]>;
}

const GlobalIntelAgent: React.FC<GlobalIntelAgentProps> = ({ driveUrl, evidenceMap }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [mode, setMode] = useState<AIModelMode>('tactical');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      role: 'model',
      content: "Global Agent Active. I have access to the full evidentiary matrix. \n\nI am ready for **High-Level Legal Strategy** or **General Technical Assistance** (sharing the app, everyday tasks). Select **'Deep Think'** for complex logic chains. How can I assist?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const repositoryContext = { driveUrl, evidenceMap };
      const { text, groundingMetadata } = await generateStrategyResponse(history, userMsg.content, mode, repositoryContext);
      
      let displayText = text;
      if (groundingMetadata?.groundingChunks) {
         displayText += "\n\n**Sources:**\n";
         groundingMetadata.groundingChunks.forEach((chunk: any) => {
            if (chunk.web) displayText += `- [${chunk.web.title}](${chunk.web.uri})\n`;
         });
      }
      
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: displayText,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error("Global agent error", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        content: "Signal lost. Please verify secure connection.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute bottom-8 right-8 w-14 h-14 bg-amber-600 hover:bg-amber-500 text-white rounded-full shadow-[0_0_20px_rgba(217,119,6,0.4)] flex items-center justify-center transition-all hover:scale-110 z-[60] group"
      >
        <Brain className="w-8 h-8 animate-pulse" />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-slate-950"></div>
      </button>
    );
  }

  return (
    <div className={`fixed right-4 bottom-4 bg-slate-900 border border-amber-500/30 rounded-xl shadow-2xl z-[60] flex flex-col transition-all duration-300 ${isMinimized ? 'w-80 h-14' : 'w-[450px] h-[600px]'}`}>
      {/* Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/50 rounded-t-xl">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-amber-500" />
          <span className="font-bold text-white text-sm">Global Intel Agent</span>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={() => setIsMinimized(!isMinimized)} className="text-slate-400 hover:text-white">
             {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
           </button>
           <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
             <X className="w-4 h-4" />
           </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Mode Selector */}
          <div className="px-2 py-2 bg-slate-950 border-b border-slate-800 grid grid-cols-4 gap-1">
            <button 
              onClick={() => setMode('blitz')}
              className={`py-1.5 rounded text-[10px] font-bold uppercase flex flex-col items-center justify-center gap-1 transition-all
                ${mode === 'blitz' ? 'bg-slate-800 text-green-400 border border-green-400/30' : 'text-slate-500 hover:text-slate-300'}`}
              title="Gemini 2.5 Flash Lite (Fast)"
            >
              <Gauge className="w-3 h-3" /> Blitz
            </button>
            <button 
              onClick={() => setMode('tactical')}
              className={`py-1.5 rounded text-[10px] font-bold uppercase flex flex-col items-center justify-center gap-1 transition-all
                ${mode === 'tactical' ? 'bg-slate-800 text-amber-500 border border-amber-500/30' : 'text-slate-500 hover:text-slate-300'}`}
              title="Gemini 2.5 Flash (Standard)"
            >
              <Zap className="w-3 h-3" /> Tact
            </button>
            <button 
              onClick={() => setMode('deep_think')}
              className={`py-1.5 rounded text-[10px] font-bold uppercase flex flex-col items-center justify-center gap-1 transition-all
                ${mode === 'deep_think' ? 'bg-slate-800 text-blue-400 border border-blue-400/30' : 'text-slate-500 hover:text-slate-300'}`}
              title="Gemini 3 Pro + Thinking (Reasoning)"
            >
              <Brain className="w-3 h-3" /> Deep
            </button>
            <button 
               onClick={() => setMode('web_search')}
               className={`py-1.5 rounded text-[10px] font-bold uppercase flex flex-col items-center justify-center gap-1 transition-all
                ${mode === 'web_search' ? 'bg-slate-800 text-purple-400 border border-purple-400/30' : 'text-slate-500 hover:text-slate-300'}`}
                title="Gemini 2.5 Flash + Google Search"
            >
              <Globe className="w-3 h-3" /> Web
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/90">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[90%] rounded-lg p-3 text-xs ${
                  msg.role === 'user' 
                    ? 'bg-amber-900/20 text-slate-200 border border-amber-500/20' 
                    : 'bg-slate-800 text-slate-300 border border-slate-700 prose prose-invert prose-p:my-1'
                }`}>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-amber-500 animate-pulse">
                <Brain className="w-3 h-3" />
                <span>
                  {mode === 'deep_think' ? 'Thinking (Max Budget)...' : 
                   mode === 'web_search' ? 'Searching Web...' : 
                   'Processing...'}
                </span>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-800 bg-slate-950 rounded-b-xl">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Query intelligence database..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-3 pr-10 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                disabled={isLoading}
                autoFocus
              />
              <button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="absolute right-1 top-1 p-1.5 text-slate-400 hover:text-amber-500 disabled:text-slate-700"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default GlobalIntelAgent;
