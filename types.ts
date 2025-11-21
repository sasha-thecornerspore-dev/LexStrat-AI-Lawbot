
export enum View {
  DASHBOARD = 'DASHBOARD',
  STRATEGY_CHAT = 'STRATEGY_CHAT',
  DOC_GENERATOR = 'DOC_GENERATOR',
  EVIDENCE_VAULT = 'EVIDENCE_VAULT',
  LIVE_WAR_ROOM = 'LIVE_WAR_ROOM',
  VISUAL_FORENSICS = 'VISUAL_FORENSICS',
  VENUE_RECON = 'VENUE_RECON',
  DOC_ANALYZER = 'DOC_ANALYZER',
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

export interface Fact {
  id: string;
  title: string;
  shortDesc: string;
  fullDetail: string;
  evidenceRef: string;
  icon: string; // Lucide icon name
  severity: 'HIGH' | 'CRITICAL' | 'FATAL';
}

export interface ProposedLead {
  id: string;
  type: 'NEW_FACT' | 'SUPPORTING_DOC';
  title: string;
  description: string;
  url?: string; // For docs
  source?: string;
  confidence: number;
}

export interface GeneratedDoc {
  title: string;
  content: string;
  date: string;
}

export interface Annotation {
  id: string;
  type: 'NOTE' | 'FILE';
  content: string;
  name?: string; // filename
  date: Date;
}

// Case Graph Types
export interface CaseEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type: 'FILING' | 'MOTION' | 'ORDER' | 'EVIDENCE';
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'PLAINTIFF' | 'DEFENDANT' | 'COURT' | 'ENTITY' | 'EVIDENCE';
}

export interface GraphLink {
  source: string;
  target: string;
  label: string;
}

export interface SourceReference {
  id: string;
  citation: string;
  summary: string;
  relevance: string;
}

// Document Analysis Types
export interface Discrepancy {
  id: string;
  quote: string; // Text from the doc
  issue: string; // The contradiction
  severity: 'POSSIBLE_PERJURY' | 'CONTRADICTION' | 'PROCEDURAL_ERROR';
  rebuttalRef: string; // Which fact rebuts this
}

export interface AnalysisResult {
  summary: string;
  discrepancies: Discrepancy[];
  recommendedAction: string;
  extractedText?: string;
}

export interface FileIndexItem {
  name: string;
  path?: string; // Relative path if available
  size: number;
  lastModified: number;
}

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}
