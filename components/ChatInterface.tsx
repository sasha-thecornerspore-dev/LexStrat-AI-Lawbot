
import React, { useState, useEffect, useRef } from 'react';
import { Message, Fact, Annotation } from '../types';
import { generateStrategyResponse, generateSpeech, transcribeAudio } from '../services/gemini';
import { Send, User, Bot, RefreshCw, Mic, Play, Loader2, Globe, Gavel, Search, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

type SearchMode = 'NONE' | 'WEB' | 'CASE_LAW';

interface ChatInterfaceProps {
  driveUrl?: string;
  facts: Fact[];
  evidenceMap: Record<string, Annotation[]>;
  onAddFact: (fact: Fact) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ driveUrl, facts, evidenceMap, onAddFact }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      content: "I have realigned the strategic matrix. **The 'Standing at Inception' argument is the kill shot.**\n\nThey admitted the Note was in the DB Vault until Sept 2025. This creates a physical impossibility: they could not have possessed or scanned the Note in Rockville at the time of filing. We must argue **Judicial Estoppel**—they cannot claim 'Continuous Possession' after admitting the Note was in a vault they previously denied utilizing.\n\nShall we draft the *Motion to Dismiss based on Void Standing Ab Initio*?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<string | null>(null);
  
  // Search Mode State
  const [searchMode, setSearchMode] = useState<SearchMode>('NONE');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
      
      let finalQuery = userMsg.content;
      let modeToUse: any = 'tactical';

      // Adjust prompt/mode based on selection
      if (searchMode === 'CASE_LAW') {
        modeToUse = 'web_search';
        finalQuery = `SEARCH QUERY: Find Maryland case law, statutes, and procedural rules regarding: "${userMsg.content}". Cite sources in Bluebook format. Prioritize *Anderson v. Burson* and Md. Rules Title 14.`;
      } else if (searchMode === 'WEB') {
        modeToUse = 'web_search';
      }

      const repositoryContext = { driveUrl: driveUrl || '', evidenceMap };

      const { text, groundingMetadata } = await generateStrategyResponse(history, finalQuery, modeToUse, repositoryContext);
      
      // Format text with grounding links if available
      let displayText = text;
      if (groundingMetadata?.groundingChunks) {
         displayText += "\n\n**Sources:**\n";
         groundingMetadata.groundingChunks.forEach((chunk: any, idx: number) => {
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
      console.error("Strategy generation failed", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: "Connection severed. Re-establishing secure link... (Check API Key)",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Audio Handling ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          setIsLoading(true);
          try {
            const text = await transcribeAudio(base64Audio);
            setInput(text);
          } catch (e) {
            console.error(e);
          } finally {
            setIsLoading(false);
          }
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (e) {
      console.error("Mic access denied", e);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleTTS = async (msgId: string, text: string) => {
    if (isPlayingAudio) return; // Prevent overlap
    setIsPlayingAudio(msgId);
    try {
      // Strip markdown for cleaner speech
      const cleanText = text.replace(/[*#]/g, ''); 
      const audioBase64 = await generateSpeech(cleanText);
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const binaryString = atob(audioBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
      
      const buffer = await audioContext.decodeAudioData(bytes.buffer);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.onended = () => setIsPlayingAudio(null);
      source.start(0);
    } catch (e) {
      console.error(e);
      setIsPlayingAudio(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-amber-500" />
            Strategy War Room
          </h2>
          <p className="text-xs text-slate-500">Secure Channel // Encrypted</p>
        </div>
        <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
             onClick={() => setSearchMode('NONE')}
             className={`px-2 py-1.5 rounded text-[10px] font-bold uppercase flex items-center gap-1 transition-all ${searchMode === 'NONE' ? 'bg-slate-800 text-amber-500 shadow' : 'text-slate-500 hover:text-slate-300'}`}
             title="Standard Strategy Mode"
          >
             <Zap className="w-3 h-3" /> Strat
          </button>
          <button
             onClick={() => setSearchMode('WEB')}
             className={`px-2 py-1.5 rounded text-[10px] font-bold uppercase flex items-center gap-1 transition-all ${searchMode === 'WEB' ? 'bg-blue-900/30 text-blue-400 shadow' : 'text-slate-500 hover:text-slate-300'}`}
             title="Web Grounding Mode"
          >
             <Globe className="w-3 h-3" /> Web
          </button>
          <button
             onClick={() => setSearchMode('CASE_LAW')}
             className={`px-2 py-1.5 rounded text-[10px] font-bold uppercase flex items-center gap-1 transition-all ${searchMode === 'CASE_LAW' ? 'bg-purple-900/30 text-purple-400 shadow' : 'text-slate-500 hover:text-slate-300'}`}
             title="Case Law Research Mode"
          >
             <Gavel className="w-3 h-3" /> Law
          </button>
        </div>
        <div className="ml-2">
          <button 
            onClick={() => setMessages([messages[0]])}
            className="text-xs text-slate-500 hover:text-white flex items-center gap-1 px-2 py-1"
          >
            <RefreshCw className="w-3 h-3" /> Reset
          </button>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6"
      >
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-slate-800' : 'bg-amber-900/30 border border-amber-500/30'}`}>
              {msg.role === 'user' ? <User className="w-5 h-5 text-slate-400" /> : <Bot className="w-6 h-6 text-amber-500" />}
            </div>
            
            <div className={`flex flex-col max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`relative rounded-2xl p-5 shadow-lg text-sm leading-relaxed group ${
                msg.role === 'user' 
                  ? 'bg-slate-800 text-slate-200 rounded-tr-none' 
                  : 'bg-slate-900 border border-slate-800 text-slate-300 rounded-tl-none prose prose-invert prose-p:my-2 prose-headings:text-amber-500 prose-headings:font-display prose-strong:text-white prose-li:marker:text-amber-600'
              }`}>
                 <ReactMarkdown>{msg.content}</ReactMarkdown>
                 
                 {msg.role === 'model' && (
                   <button 
                     onClick={() => handleTTS(msg.id, msg.content)}
                     className={`absolute -bottom-3 -left-2 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-amber-500 transition-all opacity-0 group-hover:opacity-100 shadow-md ${isPlayingAudio === msg.id ? 'text-amber-500 border-amber-500' : ''}`}
                     title="Read Aloud"
                   >
                     {isPlayingAudio === msg.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 ml-0.5" />}
                   </button>
                 )}
              </div>
              <span className="text-[10px] text-slate-600 mt-1 px-2">
                {msg.timestamp.toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
        {isLoading && (
           <div className="flex gap-4">
             <div className="w-10 h-10 rounded-full bg-amber-900/30 border border-amber-500/30 flex items-center justify-center animate-pulse">
                <Bot className="w-6 h-6 text-amber-500" />
             </div>
             <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none p-4 flex items-center gap-2">
               <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
               <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
               <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
             </div>
           </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <div className="relative max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={
              isRecording ? "Listening..." : 
              searchMode === 'CASE_LAW' ? "Enter legal question or topic (Search Active)..." :
              searchMode === 'WEB' ? "Enter web search query..." :
              "Enter strategic directive..."
            }
            disabled={isLoading || isRecording}
            className={`w-full bg-slate-950 border border-slate-700 text-white placeholder-slate-600 rounded-xl py-4 pl-6 pr-20 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all shadow-inner ${isRecording ? 'border-red-500 animate-pulse' : ''}`}
          />
          <div className="absolute right-2 top-2 flex gap-1">
             <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
                disabled={isLoading}
                className={`p-2 rounded-lg transition-colors ${isRecording ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
             >
                <Mic className="w-5 h-5" />
             </button>
             <button
                onClick={handleSend}
                disabled={isLoading || (!input.trim() && !isRecording)}
                className="p-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg transition-colors"
             >
                {searchMode === 'CASE_LAW' ? <Gavel className="w-5 h-5" /> : searchMode === 'WEB' ? <Search className="w-5 h-5" /> : <Send className="w-5 h-5" />}
             </button>
          </div>
        </div>
        <div className="text-center mt-2 flex items-center justify-center gap-2">
            <span className="text-[10px] text-slate-600 uppercase tracking-widest">Classified Material // Attorney Work Product</span>
            {searchMode === 'CASE_LAW' && <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest"> [CASE LAW SEARCH ACTIVE]</span>}
            {searchMode === 'WEB' && <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest"> [WEB UPLINK ACTIVE]</span>}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
