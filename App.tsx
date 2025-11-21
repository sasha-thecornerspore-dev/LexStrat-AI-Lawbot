
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ChatInterface from './components/ChatInterface';
import EvidenceVault from './components/EvidenceVault';
import DocumentGenerator from './components/DocumentGenerator';
import GlobalIntelAgent from './components/GlobalIntelAgent';
import LiveWarRoom from './components/LiveWarRoom';
import VisualForensics from './components/VisualForensics';
import VenueRecon from './components/VenueRecon';
import DocumentAnalyzer from './components/DocumentAnalyzer';
import CaseGraph from './components/CaseGraph';
import { View, Fact, Annotation } from './types';
import { STRATEGIC_INTEL } from './constants';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [driveUrl, setDriveUrl] = useState<string>('');
  
  // Lifted State for Evidence Repository
  const [facts, setFacts] = useState<Fact[]>(STRATEGIC_INTEL);
  const [evidenceMap, setEvidenceMap] = useState<Record<string, Annotation[]>>({});

  // Initialize from local storage on mount
  useEffect(() => {
    const savedUrl = localStorage.getItem('lexstrat_drive_url');
    if (savedUrl) {
      setDriveUrl(savedUrl);
    }
  }, []);

  const handleUpdateDriveUrl = (url: string) => {
    setDriveUrl(url);
    localStorage.setItem('lexstrat_drive_url', url);
  };
  
  const handleAddFact = (newFact: Fact) => {
    setFacts(prev => [...prev, newFact]);
  };

  const handleUpdateEvidenceMap = (newMap: Record<string, Annotation[]>) => {
    setEvidenceMap(newMap);
  };

  const renderView = () => {
    switch (currentView) {
      case View.DASHBOARD:
        return <Dashboard />;
      case View.STRATEGY_CHAT:
        return (
           <ChatInterface 
             driveUrl={driveUrl}
             evidenceMap={evidenceMap}
             facts={facts}
             onAddFact={handleAddFact}
           />
        );
      case View.EVIDENCE_VAULT:
        return (
           <EvidenceVault 
             driveUrl={driveUrl} 
             facts={facts} 
             onAddFact={handleAddFact}
             evidenceMap={evidenceMap}
             onUpdateEvidenceMap={handleUpdateEvidenceMap}
           />
        );
      case View.DOC_GENERATOR:
        return <DocumentGenerator />;
      case View.LIVE_WAR_ROOM:
        return <LiveWarRoom />;
      case View.VISUAL_FORENSICS:
        return <VisualForensics />;
      case View.VENUE_RECON:
        return <VenueRecon />;
      case View.DOC_ANALYZER:
        return (
          <DocumentAnalyzer 
             facts={facts}
             onAddFact={handleAddFact}
             evidenceMap={evidenceMap}
             onUpdateEvidenceMap={handleUpdateEvidenceMap}
          />
        );
      // case View.INTELLIGENCE_GRAPH: // Assuming CaseGraph is linked here if added to View enum
      //   return <CaseGraph />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView} 
        driveUrl={driveUrl}
        onUpdateDriveUrl={handleUpdateDriveUrl}
      />
      <main className="flex-1 h-full relative">
        {renderView()}
        
        {/* Global Status Footer */}
        <div className="absolute bottom-0 right-0 p-2 text-[10px] text-slate-700 pointer-events-none bg-slate-950/80 backdrop-blur rounded-tl-lg z-50">
          SYS.V.3.1.SCOUT // ENCRYPTED // LEXSTRAT
        </div>
        
        {/* Always Active Global Agent */}
        <GlobalIntelAgent 
           driveUrl={driveUrl}
           evidenceMap={evidenceMap}
        />
      </main>
    </div>
  );
};

export default App;
