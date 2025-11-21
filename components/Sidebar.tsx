
import React, { useState } from 'react';
import { View } from '../types';
import { LayoutDashboard, MessageSquare, FileText, ShieldAlert, Scale, Database, Settings, ExternalLink, Check, X, Mic, Image, Map, Radio, ScanLine } from 'lucide-react';

interface SidebarProps {
  currentView: View;
  onChangeView: (view: View) => void;
  driveUrl: string;
  onUpdateDriveUrl: (url: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, driveUrl, onUpdateDriveUrl }) => {
  const [isEditingDrive, setIsEditingDrive] = useState(false);
  const [tempUrl, setTempUrl] = useState(driveUrl);

  const handleSaveUrl = () => {
    onUpdateDriveUrl(tempUrl);
    setIsEditingDrive(false);
  };

  const menuItems = [
    { id: View.DASHBOARD, label: 'Mission Control', icon: LayoutDashboard },
    { id: View.EVIDENCE_VAULT, label: 'Evidence Vault', icon: ShieldAlert },
    { id: View.STRATEGY_CHAT, label: 'Strategy War Room', icon: MessageSquare },
    { id: View.DOC_GENERATOR, label: 'Motion Generator', icon: FileText },
  ];

  const toolItems = [
    { id: View.DOC_ANALYZER, label: 'Document Analyzer', icon: ScanLine },
    { id: View.LIVE_WAR_ROOM, label: 'Live War Room', icon: Mic },
    { id: View.VISUAL_FORENSICS, label: 'Visual Forensics', icon: Image },
    { id: View.VENUE_RECON, label: 'Venue Recon', icon: Map },
  ];

  return (
    <div className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col h-full shadow-2xl z-10 relative">
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <Scale className="text-amber-500 w-8 h-8" />
        <div>
          <h1 className="font-display font-bold text-lg tracking-wider text-slate-100">LEXSTRAT</h1>
          <p className="text-xs text-slate-500 tracking-widest">DEFENSE INTEL</p>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        <div className="space-y-2">
          <p className="px-4 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Command</p>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChangeView(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group
                  ${isActive 
                    ? 'bg-amber-900/20 text-amber-500 border border-amber-500/30 shadow-[0_0_15px_rgba(217,119,6,0.15)]' 
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-amber-500' : 'text-slate-500 group-hover:text-slate-300'}`} />
                <span className="font-medium text-sm tracking-wide">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          <p className="px-4 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Forensic Tools</p>
          {toolItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChangeView(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group
                  ${isActive 
                    ? 'bg-blue-900/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]' 
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                <span className="font-medium text-sm tracking-wide">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="p-4 border-t border-slate-800 space-y-4">
        {/* Repository Link Section */}
        <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <Database className="w-3 h-3 text-blue-400" />
              <span className="text-xs font-bold text-slate-500 uppercase">Case Repository</span>
            </div>
            <button 
              onClick={() => {
                setTempUrl(driveUrl);
                setIsEditingDrive(!isEditingDrive);
              }}
              className="text-slate-600 hover:text-amber-500 transition-colors"
            >
              <Settings className="w-3 h-3" />
            </button>
          </div>

          {isEditingDrive ? (
            <div className="space-y-2">
              <input 
                type="text" 
                value={tempUrl}
                onChange={(e) => setTempUrl(e.target.value)}
                placeholder="Paste G-Drive Folder URL"
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[10px] text-white focus:border-amber-500 focus:outline-none"
                autoFocus
              />
              <div className="flex gap-2">
                <button 
                  onClick={handleSaveUrl}
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-white py-1 rounded text-[10px] font-bold flex items-center justify-center gap-1"
                >
                  <Check className="w-3 h-3" /> Save
                </button>
                <button 
                  onClick={() => setIsEditingDrive(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 py-1 rounded text-[10px] font-bold flex items-center justify-center gap-1"
                >
                  <X className="w-3 h-3" /> Cancel
                </button>
              </div>
            </div>
          ) : (
             driveUrl ? (
              <a 
                href={driveUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block w-full bg-blue-900/20 hover:bg-blue-900/30 border border-blue-900/50 text-blue-400 py-2 rounded text-xs font-bold text-center transition-all flex items-center justify-center gap-2 group"
              >
                <ExternalLink className="w-3 h-3 group-hover:scale-110 transition-transform" />
                Access Drive Files
              </a>
             ) : (
               <button
                 onClick={() => setIsEditingDrive(true)}
                 className="w-full border border-dashed border-slate-700 text-slate-600 hover:text-slate-400 hover:border-slate-500 py-2 rounded text-[10px] transition-colors"
               >
                 + Link Google Drive
               </button>
             )
          )}
        </div>

        {/* Defcon Status */}
        <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
          <p className="text-xs text-slate-500 uppercase font-bold mb-1">Defcon Status</p>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-red-500 font-bold text-sm">ACTIVE LITIGATION</span>
          </div>
          <p className="text-[10px] text-slate-600 mt-2">Case: 24-C-10-005521</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
