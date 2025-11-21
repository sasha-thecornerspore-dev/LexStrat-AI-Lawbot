import React, { useState, useRef } from 'react';
import { generateExhibitImage, editEvidenceImage, generateReconstructionVideo, analyzeMedia, AspectRatio } from '../services/gemini';
import { Image as ImageIcon, Wand2, Video, Upload, Download, Loader2, ScanSearch } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

type Mode = 'EXHIBIT' | 'EDITOR' | 'RECONSTRUCTION' | 'ANALYST';

const VisualForensics: React.FC = () => {
  const [mode, setMode] = useState<Mode>('EXHIBIT');
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resultMedia, setResultMedia] = useState<string | null>(null);
  const [analysisText, setAnalysisText] = useState<string | null>(null);
  
  // Upload State
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  
  // Exhibit State
  const [imgSize, setImgSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [imgAspectRatio, setImgAspectRatio] = useState<AspectRatio>('16:9');

  // Video State
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedFile(reader.result as string);
        setMimeType(file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetState = () => {
    setResultMedia(null);
    setAnalysisText(null);
    setUploadedFile(null);
    setMimeType('');
  };

  const handleExecute = async () => {
    if (!prompt && mode !== 'ANALYST') return; // Analyst might just use file
    setIsLoading(true);
    setResultMedia(null);
    setAnalysisText(null);

    try {
      let result = '';
      if (mode === 'EXHIBIT') {
        result = await generateExhibitImage(prompt, imgSize, imgAspectRatio);
        setResultMedia(result);
      } else if (mode === 'EDITOR') {
        if (!uploadedFile) throw new Error("Image required for editing");
        result = await editEvidenceImage(uploadedFile, prompt);
        setResultMedia(result);
      } else if (mode === 'RECONSTRUCTION') {
        result = await generateReconstructionVideo(prompt, uploadedFile || undefined, videoAspectRatio);
        setResultMedia(result);
      } else if (mode === 'ANALYST') {
        if (!uploadedFile) throw new Error("File required for analysis");
        const analysis = await analyzeMedia(uploadedFile, mimeType, prompt || "Analyze this evidence in detail.");
        setAnalysisText(analysis);
      }
    } catch (error) {
      console.error(error);
      alert("Operation failed. See console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full bg-slate-950">
      {/* Left Controls */}
      <div className="w-1/3 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <Wand2 className="text-blue-500" />
            Visual Forensics
          </h2>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-4 border-b border-slate-800">
          <button 
            onClick={() => { setMode('EXHIBIT'); resetState(); }}
            className={`py-3 text-[10px] font-bold uppercase flex flex-col items-center justify-center gap-1 transition-colors ${mode === 'EXHIBIT' ? 'bg-slate-800 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <ImageIcon className="w-4 h-4" /> Exhibit
          </button>
          <button 
            onClick={() => { setMode('EDITOR'); resetState(); }}
            className={`py-3 text-[10px] font-bold uppercase flex flex-col items-center justify-center gap-1 transition-colors ${mode === 'EDITOR' ? 'bg-slate-800 text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Wand2 className="w-4 h-4" /> Editor
          </button>
          <button 
            onClick={() => { setMode('RECONSTRUCTION'); resetState(); }}
            className={`py-3 text-[10px] font-bold uppercase flex flex-col items-center justify-center gap-1 transition-colors ${mode === 'RECONSTRUCTION' ? 'bg-slate-800 text-red-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Video className="w-4 h-4" /> Veo Recon
          </button>
           <button 
            onClick={() => { setMode('ANALYST'); resetState(); }}
            className={`py-3 text-[10px] font-bold uppercase flex flex-col items-center justify-center gap-1 transition-colors ${mode === 'ANALYST' ? 'bg-slate-800 text-purple-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <ScanSearch className="w-4 h-4" /> Analyst
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Mode Specific Controls */}
          {mode === 'EXHIBIT' && (
            <div className="space-y-4">
               <div className="p-4 bg-blue-900/10 border border-blue-900/30 rounded-lg text-xs text-blue-300">
                 <strong>Goal:</strong> Generate high-fidelity demonstrative exhibits for court.
                 <br/><em>Model: Gemini 3 Pro Image</em>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Resolution</label>
                   <select value={imgSize} onChange={(e) => setImgSize(e.target.value as any)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-xs">
                     <option value="1K">1K (Standard)</option>
                     <option value="2K">2K (High)</option>
                     <option value="4K">4K (Ultra)</option>
                   </select>
                  </div>
                  <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Aspect Ratio</label>
                   <select value={imgAspectRatio} onChange={(e) => setImgAspectRatio(e.target.value as AspectRatio)} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-xs">
                     <option value="1:1">Square (1:1)</option>
                     <option value="16:9">Landscape (16:9)</option>
                     <option value="9:16">Portrait (9:16)</option>
                     <option value="4:3">Standard (4:3)</option>
                     <option value="3:4">Vertical (3:4)</option>
                     <option value="21:9">Cinema (21:9)</option>
                   </select>
                  </div>
               </div>
            </div>
          )}

          {mode === 'EDITOR' && (
             <div className="space-y-4">
                <div className="p-4 bg-amber-900/10 border border-amber-900/30 rounded-lg text-xs text-amber-300">
                 <strong>Goal:</strong> Enhance scans, remove artifacts (Aspose), or highlight forgery.
                 <br/><em>Model: Gemini 2.5 Flash Image</em>
               </div>
               <div 
                 onClick={() => fileInputRef.current?.click()}
                 className="border-2 border-dashed border-slate-700 hover:border-amber-500 rounded-lg p-8 text-center cursor-pointer transition-colors"
               >
                 <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                 {uploadedFile ? (
                   <img src={uploadedFile} alt="Upload" className="max-h-32 mx-auto rounded shadow-lg" />
                 ) : (
                   <div className="flex flex-col items-center gap-2 text-slate-500">
                     <Upload className="w-6 h-6" />
                     <span className="text-xs">Upload Evidence (PNG/JPG)</span>
                   </div>
                 )}
               </div>
            </div>
          )}

          {mode === 'RECONSTRUCTION' && (
            <div className="space-y-4">
               <div className="p-4 bg-red-900/10 border border-red-900/30 rounded-lg text-xs text-red-300">
                 <strong>Goal:</strong> Animate timeline or visualize the "impossible" logistics.
                 <br/><em>Model: Veo 3.1 Fast Generate</em>
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Aspect Ratio</label>
                 <div className="flex gap-2">
                    <button onClick={() => setVideoAspectRatio('16:9')} className={`flex-1 py-2 text-xs rounded border ${videoAspectRatio === '16:9' ? 'bg-slate-800 text-white border-red-500' : 'border-slate-700 text-slate-500'}`}>Landscape</button>
                    <button onClick={() => setVideoAspectRatio('9:16')} className={`flex-1 py-2 text-xs rounded border ${videoAspectRatio === '9:16' ? 'bg-slate-800 text-white border-red-500' : 'border-slate-700 text-slate-500'}`}>Portrait</button>
                 </div>
               </div>
               <div 
                 onClick={() => fileInputRef.current?.click()}
                 className="border border-slate-700 rounded p-3 flex items-center justify-between cursor-pointer hover:bg-slate-800"
               >
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                  <span className="text-xs text-slate-400">{uploadedFile ? 'Reference Attached' : 'Attach Image (Optional)'}</span>
                  <Upload className="w-3 h-3 text-slate-500" />
               </div>
            </div>
          )}

          {mode === 'ANALYST' && (
             <div className="space-y-4">
                <div className="p-4 bg-purple-900/10 border border-purple-900/30 rounded-lg text-xs text-purple-300">
                 <strong>Goal:</strong> Automated analysis of evidence (Images or Video).
                 <br/><em>Model: Gemini 3 Pro</em>
               </div>
               <div 
                 onClick={() => fileInputRef.current?.click()}
                 className="border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-lg p-8 text-center cursor-pointer transition-colors"
               >
                 <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,video/*" />
                 {uploadedFile ? (
                    mimeType.startsWith('video') ? (
                        <div className="flex flex-col items-center gap-2 text-purple-400">
                             <Video className="w-8 h-8" />
                             <span className="text-xs">Video File Loaded</span>
                        </div>
                    ) : (
                        <img src={uploadedFile} alt="Upload" className="max-h-32 mx-auto rounded shadow-lg" />
                    )
                 ) : (
                   <div className="flex flex-col items-center gap-2 text-slate-500">
                     <Upload className="w-6 h-6" />
                     <span className="text-xs">Upload Image or Video</span>
                   </div>
                 )}
               </div>
            </div>
          )}

          {/* Common Prompt */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                {mode === 'ANALYST' ? 'Analysis Query' : 'Generation Prompt'}
            </label>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                mode === 'EXHIBIT' ? "E.g., A detailed diagram showing the path of a Promissory Note..." :
                mode === 'EDITOR' ? "E.g., Highlight the signature in red and remove the background noise..." :
                mode === 'ANALYST' ? "E.g., Describe the metadata anomalies in this document scan..." :
                "E.g., A cinematic drone shot of the Deutsche Bank Vault..."
              }
              className="w-full h-32 bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-blue-500 focus:outline-none resize-none"
            />
          </div>

          <button 
            onClick={handleExecute}
            disabled={isLoading || (!prompt && mode !== 'ANALYST')}
            className={`w-full py-4 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-all ${isLoading ? 'bg-slate-800' : 'bg-blue-600 hover:bg-blue-500'}`}
          >
            {isLoading ? <Loader2 className="animate-spin" /> : (mode === 'ANALYST' ? 'ANALYZE EVIDENCE' : 'EXECUTE GENERATION')}
          </button>
        </div>
      </div>

      {/* Right Preview */}
      <div className="flex-1 bg-slate-950 flex flex-col p-8 relative overflow-hidden">
        <div className="absolute inset-0 grid grid-cols-[40px_40px] opacity-5">
           {[...Array(100)].map((_, i) => <div key={i} className="border-r border-b border-white"></div>)}
        </div>
        
        <div className="relative z-10 flex-1 flex flex-col bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          {mode === 'ANALYST' && analysisText ? (
            <div className="p-8 overflow-y-auto prose prose-invert prose-sm max-w-none">
               <h3 className="text-purple-400 font-bold uppercase mb-4 flex items-center gap-2">
                   <ScanSearch className="w-5 h-5" /> Forensic Analysis Report
               </h3>
               <ReactMarkdown>{analysisText}</ReactMarkdown>
            </div>
          ) : resultMedia ? (
            <div className="flex-1 flex items-center justify-center p-4">
                {mode === 'RECONSTRUCTION' ? (
                <video controls src={resultMedia} className="max-w-full max-h-full" />
                ) : (
                <img src={resultMedia} alt="Result" className="max-w-full max-h-full object-contain" />
                )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-20">
               <ImageIcon className="w-24 h-24 mx-auto mb-4" />
               <h3 className="text-2xl font-bold font-display">AWAITING INPUT</h3>
            </div>
          )}
        </div>

        {resultMedia && mode !== 'ANALYST' && (
          <div className="relative z-10 mt-6 flex justify-center">
            <a 
              href={resultMedia} 
              download={`forensic-output-${Date.now()}.${mode === 'RECONSTRUCTION' ? 'mp4' : 'png'}`}
              className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 border border-slate-600 transition-colors"
            >
              <Download className="w-4 h-4" /> Download Asset
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualForensics;
