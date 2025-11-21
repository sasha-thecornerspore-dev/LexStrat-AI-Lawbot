
import React, { useState, useRef, useEffect } from 'react';
import { Fact, Annotation, AnalysisResult, Message } from '../types';
import { analyzeLegalDocument, chatWithDocument } from '../services/gemini';
import { Upload, FileText, AlertTriangle, Check, ArrowRight, ScanLine, Loader2, ZoomIn, AlertCircle, Eye, AlignLeft, MessageSquare, Send, Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface DocumentAnalyzerProps {
  facts: Fact[];
  onAddFact: (fact: Fact) => void;
  evidenceMap: Record<string, Annotation[]>;
  onUpdateEvidenceMap: (map: Record<string, Annotation[]>) => void;
}

const DocumentAnalyzer: React.FC<DocumentAnalyzerProps> = ({ facts, onAddFact, evidenceMap, onUpdateEvidenceMap }) => {
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<'REPORT' | 'RAW_TEXT'>('REPORT');
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(selectedFile);
      setResult(null); // Reset previous results
      setChatMessages([]); // Reset chat
      setActiveTab('REPORT');
    }
  };

  const runAnalysis = async () => {
    if (!file || !filePreview) return;
    setIsAnalyzing(true);
    try {
      const analysis = await analyzeLegalDocument(
        filePreview,
        file.type,
        facts
      );
      setResult(analysis);
      // Init Chat
      setChatMessages([{
        id: 'init',
        role: 'model',
        content: `**Analysis Complete.** I have extracted the text and flagged ${analysis.discrepancies.length} discrepancies. \n\nYou may now issue directives (e.g., "Draft a Motion to Strike this", "Summarize the perjury") or ask questions about specific paragraphs.`,
        timestamp: new Date()
      }]);
    } catch (e) {
      console.error("Analysis failed", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || !result) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatting(true);

    try {
       const history = chatMessages.map(m => ({ role: m.role, content: m.content }));
       const responseText = await chatWithDocument(
           history, 
           userMsg.content, 
           { extractedText: result.extractedText || "", summary: result.summary },
           facts
       );
       
       setChatMessages(prev => [...prev, {
           id: (Date.now()+1).toString(),
           role: 'model',
           content: responseText,
           timestamp: new Date()
       }]);
    } catch (e) {
        console.error(e);
    } finally {
        setIsChatting(false);
    }
  };

  useEffect(() => {
    if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const promoteDiscrepancy = (d: any) => {
    const newFact: Fact = {
      id: Date.now().toString(),
      title: "Verified Perjury: " + d.issue.substring(0, 20) + "...",
      shortDesc: `Contradicts ${d.rebuttalRef}`,
      fullDetail: `DOCUMENT CLAIM: "${d.quote}" \n\nTRUTH: ${d.issue}`,
      evidenceRef: file?.name || "Analyzed Doc",
      icon: "FileWarning",
      severity: d.severity === "POSSIBLE_PERJURY" ? "FATAL" : "CRITICAL"
    };
    onAddFact(newFact);
    alert("Discrepancy added to Evidence Vault.");
  };

  return (
    <div className="flex h-full bg-slate-950 overflow-hidden">
      {/* Left Panel: Document Preview */}
      <div className="w-1/2 bg-slate-900 border-r border-slate-800 flex flex-col p-6">
        <header className="mb-6">
          <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <ScanLine className="text-purple-500" />
            Document Analyzer
          </h2>
          <p className="text-slate-400 text-sm">
            Upload Plaintiff filings. AI will perform OCR & Cross-Reference against the Vault.
          </p>
        </header>

        <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden relative flex flex-col">
          {filePreview ? (
            <div className="flex-1 relative overflow-auto flex items-center justify-center bg-slate-900/50">
              {file?.type.includes('image') ? (
                <img src={filePreview} alt="Preview" className="max-w-full max-h-full object-contain shadow-lg" />
              ) : (
                <div className="text-center p-10">
                   <FileText className="w-20 h-20 text-slate-500 mx-auto mb-4" />
                   <p className="text-slate-300 font-bold">{file?.name}</p>
                   <p className="text-slate-500 text-sm">PDF Document Loaded</p>
                </div>
              )}
              
              {isAnalyzing && (
                <div className="absolute inset-0 bg-purple-900/10 z-10">
                  <div className="w-full h-1 bg-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
                </div>
              )}
            </div>
          ) : (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-900 transition-colors group"
            >
              <div className="p-6 rounded-full bg-slate-900 group-hover:bg-slate-800 border-2 border-dashed border-slate-700 group-hover:border-purple-500 transition-colors mb-4">
                <Upload className="w-8 h-8 text-slate-500 group-hover:text-purple-400" />
              </div>
              <p className="text-slate-400 font-bold">Click to Upload Filing</p>
              <p className="text-slate-600 text-xs uppercase mt-1">PDF, PNG, JPG Supported</p>
            </div>
          )}
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            className="hidden" 
            accept="application/pdf,image/*"
          />

          {file && (
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-between items-center">
              <button 
                onClick={() => { setFile(null); setFilePreview(null); setResult(null); }}
                className="text-xs text-slate-500 hover:text-white"
              >
                Clear File
              </button>
              <button
                onClick={runAnalysis}
                disabled={isAnalyzing}
                className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ZoomIn className="w-4 h-4" />}
                {isAnalyzing ? 'Scanning...' : 'OCR & Forensic Analysis'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Split View (Report + Chat) */}
      <div className="w-1/2 bg-slate-950 flex flex-col border-l border-slate-800">
         
         {/* Tabs */}
         {result && (
           <div className="flex border-b border-slate-800 bg-slate-900 flex-shrink-0">
              <button 
                onClick={() => setActiveTab('REPORT')}
                className={`flex-1 py-3 text-xs font-bold uppercase flex items-center justify-center gap-2 ${activeTab === 'REPORT' ? 'text-purple-400 border-b-2 border-purple-400 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Eye className="w-4 h-4" /> Report
              </button>
              <button 
                onClick={() => setActiveTab('RAW_TEXT')}
                className={`flex-1 py-3 text-xs font-bold uppercase flex items-center justify-center gap-2 ${activeTab === 'RAW_TEXT' ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <AlignLeft className="w-4 h-4" /> Raw Text
              </button>
           </div>
         )}

         {/* Content Area (Top Half) */}
        <div className="flex-1 overflow-y-auto p-6 border-b border-slate-800">
          {!result ? (
            <div className="h-full flex flex-col items-center justify-center opacity-30">
              <AlertTriangle className="w-24 h-24 mb-6 text-slate-500" />
              <h3 className="text-2xl font-bold font-display text-slate-400">Awaiting Analysis</h3>
              <p className="text-sm text-slate-500 mt-2 max-w-md text-center">
                Upload a document and initiate the scan. The AI will extract text (OCR) and compare against the Evidence Vault.
              </p>
            </div>
          ) : (
            <>
              {activeTab === 'REPORT' ? (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                  <div className="p-4 bg-slate-900 border border-purple-500/30 rounded-lg">
                    <h3 className="text-purple-400 text-xs font-bold uppercase mb-2">Executive Summary</h3>
                    <p className="text-slate-200 text-sm leading-relaxed">{result.summary}</p>
                  </div>

                  <div>
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                      <AlertCircle className="text-red-500 w-5 h-5" />
                      Identified Discrepancies
                      <span className="bg-red-900/30 text-red-400 px-2 py-0.5 rounded-full text-xs">
                        {result.discrepancies.length} Found
                      </span>
                    </h3>
                    
                    <div className="space-y-4">
                      {result.discrepancies.map((item, idx) => (
                        <div key={idx} className="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-red-500/50 transition-colors group">
                          <div className="flex justify-between items-start mb-3">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                              item.severity === 'POSSIBLE_PERJURY' ? 'bg-red-900/20 text-red-500' : 'bg-orange-900/20 text-orange-500'
                            }`}>
                              {item.severity.replace('_', ' ')}
                            </span>
                            <button 
                              onClick={() => promoteDiscrepancy(item)}
                              className="text-slate-500 hover:text-green-400 text-xs font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Check className="w-3 h-3" /> Add to Vault
                            </button>
                          </div>
                          <div className="mb-3 pl-3 border-l-2 border-slate-700">
                            <p className="text-xs text-slate-500 italic mb-1">" {item.quote} "</p>
                          </div>
                          <div className="flex items-start gap-2 text-sm text-white">
                            <ArrowRight className="w-4 h-4 text-red-500 mt-1 flex-shrink-0" />
                            <p>{item.issue}</p>
                          </div>
                          <p className="mt-3 text-[10px] text-slate-500 uppercase font-bold">
                            Rebutted By: <span className="text-blue-400">{item.rebuttalRef}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 bg-blue-900/10 border border-blue-900/30 rounded-lg mt-6">
                    <h3 className="text-blue-400 text-xs font-bold uppercase mb-2">Recommended Action</h3>
                    <p className="text-slate-300 text-sm italic">{result.recommendedAction}</p>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col animate-in slide-in-from-right-4">
                  <div className="mb-4 flex justify-between items-center">
                     <h3 className="text-blue-400 text-xs font-bold uppercase">Raw Extracted Text (OCR)</h3>
                     <button 
                       onClick={() => navigator.clipboard.writeText(result.extractedText || "")}
                       className="text-xs text-slate-500 hover:text-white"
                     >
                       Copy to Clipboard
                     </button>
                  </div>
                  <div className="flex-1 bg-slate-900 rounded-lg p-4 border border-slate-800 overflow-auto">
                    <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                      {result.extractedText || "No text extracted."}
                    </pre>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Chat Interface (Bottom Half) */}
        {result && (
            <div className="h-[40%] flex flex-col bg-slate-900 border-t border-slate-800">
                <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-slate-400 uppercase">Analyst Directive Channel</span>
                </div>
                
                <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                    {chatMessages.map(msg => (
                        <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-slate-800' : 'bg-purple-900/30'}`}>
                                {msg.role === 'user' ? <User className="w-3 h-3 text-slate-400" /> : <Bot className="w-4 h-4 text-purple-400" />}
                            </div>
                            <div className={`rounded-lg p-3 text-xs max-w-[85%] ${msg.role === 'user' ? 'bg-slate-800 text-white' : 'bg-slate-950 border border-slate-800 text-slate-300'}`}>
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                        </div>
                    ))}
                    {isChatting && (
                         <div className="flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                                <Bot className="w-4 h-4 text-purple-400" />
                            </div>
                            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex items-center gap-1">
                                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            </div>
                         </div>
                    )}
                </div>

                <div className="p-3 bg-slate-950">
                    <div className="relative">
                        <input 
                            type="text" 
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
                            placeholder="Issue directive (e.g., 'Draft a Motion to Strike this affidavit')..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-3 pr-10 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                            disabled={isChatting}
                        />
                        <button 
                            onClick={handleChatSend}
                            disabled={isChatting || !chatInput.trim()}
                            className="absolute right-1 top-1 p-1.5 text-slate-400 hover:text-purple-500"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default DocumentAnalyzer;
