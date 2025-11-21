import React from 'react';
import { STRATEGIC_INTEL } from '../constants';
import { AlertTriangle, Clock, Gavel, Activity } from 'lucide-react';

const Dashboard: React.FC = () => {
  return (
    <div className="p-8 space-y-8 overflow-y-auto h-full bg-gradient-to-br from-slate-950 to-slate-900">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-display font-bold text-white mb-2">Mission Control</h2>
          <p className="text-slate-400">Strategic overview for Case No. 24-C-10-005521 // Defendant: J. Schatz</p>
        </div>
        <div className="bg-red-900/20 border border-red-900/50 px-4 py-2 rounded text-right">
          <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Judicial Environment</p>
          <p className="text-sm text-white font-bold">HOSTILE (Judge Rhodes)</p>
        </div>
      </header>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900/50 p-6 rounded-xl border border-red-900/30 shadow-lg backdrop-blur-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <span className="text-xs font-mono text-red-400">VIOLATION</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">Sub Curia</h3>
          <p className="text-sm text-slate-400">Civil Contempt</p>
          <div className="mt-4 text-xs text-slate-500">Sale conducted pending motions</div>
        </div>

        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 shadow-lg backdrop-blur-sm">
           <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Activity className="w-6 h-6 text-amber-500" />
            </div>
            <span className="text-xs font-mono text-amber-400">INTEL</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">{STRATEGIC_INTEL.length}</h3>
          <p className="text-sm text-slate-400">Forensic Leads</p>
          <div className="mt-4 text-xs text-slate-500">Verified DB Vault Logs</div>
        </div>

         <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 shadow-lg backdrop-blur-sm">
           <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Clock className="w-6 h-6 text-blue-500" />
            </div>
            <span className="text-xs font-mono text-blue-400">DEADLINE</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">10 Days</h3>
          <p className="text-sm text-slate-400">Exceptions to Sale</p>
          <div className="mt-4 text-xs text-slate-500">Due: Dec 01, 2025</div>
        </div>

        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 shadow-lg backdrop-blur-sm">
           <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Gavel className="w-6 h-6 text-purple-500" />
            </div>
            <span className="text-xs font-mono text-purple-400">STRATEGY</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">Void Ab Initio</h3>
          <p className="text-sm text-slate-400">Standing at Inception</p>
          <div className="mt-4 text-xs text-slate-500">Note in DB Vault</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Intel */}
        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-xl font-display font-bold text-white mb-6 flex items-center gap-2">
            <span className="w-1 h-6 bg-amber-500 rounded-full"></span>
            Forensic Intelligence Stream
          </h3>
          <div className="space-y-4">
             {STRATEGIC_INTEL.map((fact, idx) => (
               <div key={fact.id} className="flex items-start gap-4 p-4 bg-slate-950/50 rounded-lg border border-slate-800 hover:border-amber-500/30 transition-colors">
                 <div className="text-amber-500 font-mono text-sm">0{idx + 1}</div>
                 <div>
                   <h4 className="text-slate-200 font-bold text-sm mb-1">{fact.title}</h4>
                   <p className="text-slate-400 text-sm">{fact.shortDesc}</p>
                 </div>
                 <div className={`ml-auto px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider
                   ${fact.severity === 'FATAL' ? 'bg-red-900/20 text-red-400' : 
                     fact.severity === 'CRITICAL' ? 'bg-orange-900/20 text-orange-400' : 'bg-blue-900/20 text-blue-400'}`}>
                   {fact.severity}
                 </div>
               </div>
             ))}
          </div>
        </div>

        {/* Action Items */}
        <div className="col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-6">
           <h3 className="text-xl font-display font-bold text-white mb-6 flex items-center gap-2">
            <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
            Priority Actions
          </h3>
          <ul className="space-y-3">
            <li className="flex items-center gap-3 p-3 bg-slate-800/50 rounded border border-slate-700 text-sm text-slate-300">
              <input type="checkbox" className="accent-amber-500 w-4 h-4" checked readOnly />
              <span>File Exceptions to Sale</span>
            </li>
            <li className="flex items-center gap-3 p-3 bg-slate-800/50 rounded border border-slate-700 text-sm text-slate-300">
              <input type="checkbox" className="accent-amber-500 w-4 h-4" />
              <span>Draft Judicial Estoppel Argument</span>
            </li>
            <li className="flex items-center gap-3 p-3 bg-slate-800/50 rounded border border-slate-700 text-sm text-slate-300">
              <input type="checkbox" className="accent-amber-500 w-4 h-4" />
              <span>Subpoena DB Vault Logs (Sept 2025)</span>
            </li>
             <li className="flex items-center gap-3 p-3 bg-slate-800/50 rounded border border-slate-700 text-sm text-slate-300">
              <input type="checkbox" className="accent-amber-500 w-4 h-4" />
              <span>Challenge Rule 14-305(c)</span>
            </li>
          </ul>
          
          <div className="mt-8 p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg">
            <h5 className="text-blue-400 text-xs font-bold uppercase mb-2">Strategist Note</h5>
            <p className="text-slate-400 text-xs italic">
              "The 'Physical Impossibility' is our strongest pivot. The Note was in the DB Vault until Sept 2025. They claimed to have it in Rockville when they filed. It physically could not be in two places at once. The lawsuit was dead on arrival."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;