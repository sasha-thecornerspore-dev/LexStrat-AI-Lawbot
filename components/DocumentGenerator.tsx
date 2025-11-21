import React, { useState } from 'react';
import { generateDocument } from '../services/gemini';
import { FileText, Download, Loader2, Printer } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const DocumentGenerator: React.FC = () => {
  const [docType, setDocType] = useState('Exceptions to Sale');
  const [focus, setFocus] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!focus) return;
    setIsGenerating(true);
    try {
      const content = await generateDocument(docType, focus);
      setGeneratedContent(content);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-full bg-slate-950">
      {/* Left Panel: Controls */}
      <div className="w-1/3 border-r border-slate-800 p-6 overflow-y-auto bg-slate-900">
        <h2 className="text-2xl font-display font-bold text-white mb-6 flex items-center gap-3">
          <FileText className="text-amber-500" />
          Motion Generator
        </h2>

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Document Type</label>
            <select 
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-amber-500 focus:outline-none"
            >
              <option>Exceptions to Sale</option>
              <option>Motion to Vacate Sale</option>
              <option>Motion to Dismiss</option>
              <option>Emergency Motion to Stay</option>
              <option>Affidavit of Forgery</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Strategic Focus</label>
            <textarea 
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="E.g., Focus heavily on the 'Aspose' metadata forgery and the fact that the sale occurred while the Motion to Dismiss was Sub Curia."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white h-48 resize-none focus:border-amber-500 focus:outline-none placeholder-slate-600 text-sm"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !focus}
            className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold py-4 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {isGenerating ? <Loader2 className="animate-spin" /> : 'GENERATE MOTION'}
          </button>

          <div className="p-4 bg-blue-900/10 border border-blue-900/30 rounded text-xs text-blue-400">
            <strong>Tip:</strong> The generator automatically injects the "Unchangeable Facts" and follows Md. Rules formatting.
          </div>
        </div>
      </div>

      {/* Right Panel: Preview */}
      <div className="flex-1 bg-slate-800 p-8 overflow-y-auto flex justify-center relative">
        {generatedContent ? (
          <div className="w-full max-w-[210mm]">
            <div className="flex justify-end gap-3 mb-4 no-print">
               <button className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded flex items-center gap-2 text-sm">
                 <Printer className="w-4 h-4" /> Print
               </button>
               <button className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded flex items-center gap-2 text-sm">
                 <Download className="w-4 h-4" /> Save PDF
               </button>
            </div>
            <div className="legal-paper text-black font-serif text-[11pt] leading-relaxed prose max-w-none prose-headings:font-serif prose-headings:uppercase prose-headings:text-black prose-headings:font-bold prose-p:text-justify">
               <ReactMarkdown>{generatedContent}</ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-500 h-full opacity-50">
            <FileText className="w-24 h-24 mb-4 stroke-1" />
            <p className="text-lg font-display">Ready to Draft</p>
            <p className="text-sm">Select parameters and execute generation.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentGenerator;