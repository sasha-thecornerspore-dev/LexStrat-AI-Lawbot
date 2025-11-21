
import React, { useState } from 'react';
import { Fact, ProposedLead, Annotation } from '../types';
import { scoutForensicLeads } from '../services/gemini';
import { FileWarning, Truck, Network, Scale, Gavel, LucideIcon, FileSearch, Plus, Paperclip, FileText, ExternalLink, Loader2, Sparkles, Check, X, AlertCircle } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  FileWarning,
  Truck,
  Network,
  Scale,
  Gavel,
  AlertCircle
};

interface EvidenceVaultProps {
  driveUrl?: string;
  facts: Fact[];
  onAddFact: (fact: Fact) => void;
  evidenceMap: Record<string, Annotation[]>;
  onUpdateEvidenceMap: (map: Record<string, Annotation[]>) => void;
}

const EvidenceVault: React.FC<EvidenceVaultProps> = ({ driveUrl, facts, onAddFact, evidenceMap, onUpdateEvidenceMap }) => {
  const [activeInput, setActiveInput] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');
  
  // Scout State
  const [isScouting, setIsScouting] = useState(false);
  const [proposedLeads, setProposedLeads] = useState<ProposedLead[]>([]);

  const handleAddNote = (factId: string) => {
    if (!noteInput.trim()) return;
    const newNote: Annotation = {
      id: Date.now().toString(),
      type: 'NOTE',
      content: noteInput,
      date: new Date()
    };
    onUpdateEvidenceMap({
      ...evidenceMap,
      [factId]: [...(evidenceMap[factId] || []), newNote]
    });
    setNoteInput('');
    setActiveInput(null);
  };

  const handleFileUpload = (factId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const newFile: Annotation = {
      id: Date.now().toString(),
      type: 'FILE',
      content: URL.createObjectURL(file), // Mock URL for demo
      name: file.name,
      date: new Date()
    };
    onUpdateEvidenceMap({
      ...evidenceMap,
      [factId]: [...(evidenceMap[factId] || []), newFile]
    });
  };

  const startScouting = async () => {
    setIsScouting(true);
    try {
      const results = await scoutForensicLeads(facts);
      setProposedLeads(results);
    } catch (e) {
      console.error(e);
    } finally {
      setIsScouting(false);
    }
  };

  const acceptLead = (lead: ProposedLead) => {
    if (lead.type === 'NEW_FACT') {
      const newFact: Fact = {
        id: Date.now().toString(),
        title: lead.title,
        shortDesc: lead.description.substring(0, 50) + '...',
        fullDetail: lead.description + (lead.url ? ` Source: ${lead.url}` : ''),
        evidenceRef: lead.source || 'AI Scout Discovery',
        icon: 'AlertCircle',
        severity: 'CRITICAL' // Default for new findings
      };
      onAddFact(newFact);
    } else if (lead.type === 'SUPPORTING_DOC') {
      // Add as file annotation to the first relevant fact (simplified logic)
      // In a real app, AI would suggest WHICH fact it belongs to.
      // For now, we attach it to the most recent fact or create a generic one?
      // Better: Create a generic "Research" fact if none exists, or just alert user.
      // Actually, let's add it as a Note to the first fact for now to demonstrate capability.
      if (facts.length > 0) {
         const targetFactId = facts[0].id;
         const newNote: Annotation = {
           id: Date.now().toString(),
           type: 'FILE',
           content: lead.url || 'External Link',
           name: lead.title,
           date: new Date()
         };
         onUpdateEvidenceMap({
           ...evidenceMap,
           [targetFactId]: [...(evidenceMap[targetFactId] || []), newNote]
         });
      }
    }
    // Remove from proposals
    setProposedLeads(prev => prev.filter(p => p.id !== lead.id));
  };

  const dismissLead = (id: string) => {
    setProposedLeads(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-950">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-display font-bold text-white mb-2">Evidence Vault</h2>
          <p className="text-slate-400">Active Forensic Leads & Verified Violations. Evolving status.</p>
        </div>
        <div className="flex gap-3">
          {driveUrl && (
            <a 
              href={driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-900/20 border border-blue-700/50 hover:bg-blue-900/40 text-blue-400 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open Drive Folder
            </a>
          )}
          <button 
            onClick={startScouting}
            disabled={isScouting}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-all shadow-[0_0_15px_rgba(147,51,234,0.3)]"
          >
            {isScouting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isScouting ? 'Scouting Sector...' : 'AI Auto-Scout'}
          </button>
        </div>
      </header>

      {/* Incoming Intelligence Stream */}
      {proposedLeads.length > 0 && (
        <div className="mb-8 bg-slate-900/80 border border-purple-500/30 rounded-xl p-6 animate-in slide-in-from-top-4">
           <h3 className="text-purple-400 font-bold uppercase mb-4 flex items-center gap-2 text-sm">
             <Sparkles className="w-4 h-4" /> Incoming Intelligence Stream
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {proposedLeads.map((lead) => (
               <div key={lead.id} className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${lead.type === 'NEW_FACT' ? 'bg-amber-900/30 text-amber-500' : 'bg-blue-900/30 text-blue-500'}`}>
                      {lead.type === 'NEW_FACT' ? 'New Lead' : 'Supporting Doc'}
                    </span>
                    <span className="text-xs text-slate-500">{lead.confidence}% Conf.</span>
                  </div>
                  <h4 className="text-white font-bold text-sm mb-1">{lead.title}</h4>
                  <p className="text-slate-400 text-xs mb-3 flex-1">{lead.description}</p>
                  {lead.url && <a href={lead.url} target="_blank" rel="noreferrer" className="text-blue-400 text-xs underline mb-3 truncate">{lead.url}</a>}
                  
                  <div className="flex gap-2 mt-auto">
                    <button onClick={() => acceptLead(lead)} className="flex-1 bg-green-900/20 hover:bg-green-900/40 text-green-400 border border-green-900/50 py-1 rounded text-xs font-bold flex items-center justify-center gap-1">
                      <Check className="w-3 h-3" /> Add to Vault
                    </button>
                    <button onClick={() => dismissLead(lead.id)} className="flex-1 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50 py-1 rounded text-xs font-bold flex items-center justify-center gap-1">
                      <X className="w-3 h-3" /> Dismiss
                    </button>
                  </div>
               </div>
             ))}
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {facts.map((fact) => {
          const Icon = iconMap[fact.icon] || FileWarning;
          const annotations = evidenceMap[fact.id] || [];

          return (
            <div key={fact.id} className="bg-slate-900 border border-slate-800 rounded-xl p-0 overflow-hidden flex flex-col md:flex-row transition-colors group">
              {/* Left Stripe */}
              <div className={`w-full md:w-2 ${fact.severity === 'FATAL' ? 'bg-red-600' : fact.severity === 'CRITICAL' ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
              
              {/* Icon Section */}
              <div className="p-6 flex items-center justify-center bg-slate-900/50 md:w-32 border-b md:border-b-0 md:border-r border-slate-800">
                 <div className={`p-4 rounded-full ${fact.severity === 'FATAL' ? 'bg-red-900/20' : 'bg-slate-800'}`}>
                    <Icon className={`w-8 h-8 ${fact.severity === 'FATAL' ? 'text-red-500' : 'text-slate-400'}`} />
                 </div>
              </div>

              {/* Content Section */}
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-mono text-xs text-slate-500">REF: {fact.evidenceRef}</span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                     fact.severity === 'FATAL' ? 'bg-red-900/30 text-red-400 border border-red-900/50' : 
                     fact.severity === 'CRITICAL' ? 'bg-orange-900/30 text-orange-400 border border-orange-900/50' : 'bg-blue-900/30 text-blue-400 border border-blue-900/50'
                  }`}>
                    {fact.severity}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-amber-500 transition-colors">{fact.title}</h3>
                <p className="text-slate-300 leading-relaxed font-serif mb-6">{fact.fullDetail}</p>

                {/* Annotation Area */}
                <div className="mt-auto border-t border-slate-800 pt-4">
                   <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                     Supporting Documentation
                     <span className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full text-[10px]">{annotations.length}</span>
                   </h4>
                   
                   <div className="space-y-2 mb-4">
                     {annotations.length === 0 && <p className="text-slate-600 text-xs italic">No supporting documents attached yet.</p>}
                     {annotations.map((note) => (
                       <div key={note.id} className="flex items-start gap-2 bg-slate-950/50 p-2 rounded border border-slate-800">
                          {note.type === 'FILE' ? <Paperclip className="w-3 h-3 text-blue-400 mt-1" /> : <FileText className="w-3 h-3 text-amber-400 mt-1" />}
                          <div className="text-xs text-slate-300 break-all">
                            {note.type === 'FILE' ? (
                              <a href={note.content} target="_blank" rel="noreferrer" className="font-bold text-blue-400 underline cursor-pointer hover:text-blue-300">{note.name}</a>
                            ) : (
                              <span>{note.content}</span>
                            )}
                            <div className="text-[10px] text-slate-600 mt-0.5">{note.date.toLocaleDateString()}</div>
                          </div>
                       </div>
                     ))}
                   </div>

                   {activeInput === fact.id ? (
                     <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                       <textarea 
                         className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                         placeholder="Enter forensic note or observation..."
                         rows={2}
                         autoFocus
                         value={noteInput}
                         onChange={(e) => setNoteInput(e.target.value)}
                         onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddNote(fact.id); }}}
                       />
                       <div className="flex justify-between items-center">
                         <button 
                            onClick={() => handleAddNote(fact.id)}
                            className="bg-amber-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-amber-500"
                         >
                           Add Note
                         </button>
                         <button 
                            onClick={() => setActiveInput(null)}
                            className="text-slate-500 hover:text-white text-xs"
                         >
                           Cancel
                         </button>
                       </div>
                     </div>
                   ) : (
                     <div className="flex gap-2">
                        <button 
                          onClick={() => setActiveInput(fact.id)}
                          className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1.5 rounded border border-slate-700 transition-colors"
                        >
                          <Plus className="w-3 h-3" /> Add Note
                        </button>
                        <label className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1.5 rounded border border-slate-700 transition-colors cursor-pointer">
                          <Paperclip className="w-3 h-3" /> Attach File
                          <input type="file" className="hidden" onChange={(e) => handleFileUpload(fact.id, e)} />
                        </label>
                     </div>
                   )}
                </div>
              </div>

              {/* Action */}
              <div className="p-6 border-t md:border-t-0 md:border-l border-slate-800 flex items-center justify-center bg-slate-900/30 w-full md:w-48">
                <div className="text-center">
                    <div className="text-xs text-slate-500 mb-2">Confidence Level</div>
                    <div className="text-2xl font-bold text-white">
                      {fact.severity === 'FATAL' ? '100%' : '85%'}
                    </div>
                    <div className="text-[10px] text-amber-500 mt-1">
                      {fact.severity === 'FATAL' ? 'VERIFIED' : 'INVESTIGATING'}
                    </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EvidenceVault;
