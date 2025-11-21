
import React, { useState } from 'react';
import { queryVenueIntelligence } from '../services/gemini';
import { Map, Search, Navigation, MapPin } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Fact } from '../types';

interface MapChunk {
  web?: { uri: string; title: string };
  maps?: { uri: string; title: string; placeAnswerSources?: any };
}

interface VenueReconProps {
  facts: Fact[];
}

const VenueRecon: React.FC<VenueReconProps> = ({ facts }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [mapData, setMapData] = useState<MapChunk[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setResponse('');
    setMapData([]);

    try {
      // Pass facts to provide case context
      const result = await queryVenueIntelligence(query, facts);
      setResponse(result.text);
      setMapData(result.mapChunks);
    } catch (error) {
      console.error(error);
      setResponse('Intelligence query failed. Maps grounding unavailable.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex bg-slate-950">
      {/* Search Panel */}
      <div className="w-1/3 bg-slate-900 border-r border-slate-800 p-6 flex flex-col">
         <h2 className="text-2xl font-display font-bold text-white mb-6 flex items-center gap-2">
            <Map className="text-green-500" />
            Venue Recon
         </h2>
         
         <div className="space-y-4 flex-1">
           <div>
             <label className="text-xs font-bold text-slate-500 uppercase">Target Location Query</label>
             <div className="relative mt-2">
                <input 
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="E.g., 'Distance between Substitute Trustee and Courthouse?'"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-3 pl-4 pr-12 text-white focus:border-green-500 focus:outline-none"
                />
                <button 
                  onClick={handleSearch}
                  disabled={isLoading}
                  className="absolute right-2 top-2 p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-green-500"
                >
                  <Search className="w-4 h-4" />
                </button>
             </div>
             <p className="text-[10px] text-slate-600 mt-2">
               Context Active: {facts.length} known case facts injected into query.
             </p>
           </div>

           <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 h-full overflow-y-auto">
             {isLoading ? (
               <div className="flex items-center gap-2 text-green-500 animate-pulse">
                 <Navigation className="w-4 h-4 animate-spin" />
                 <span className="text-xs font-mono">SATELLITE UPLINK ESTABLISHED...</span>
               </div>
             ) : response ? (
                <div className="prose prose-invert prose-sm max-w-none">
                   <ReactMarkdown>{response}</ReactMarkdown>
                </div>
             ) : (
               <div className="text-center text-slate-600 mt-10">
                 <Map className="w-12 h-12 mx-auto mb-2 opacity-20" />
                 <p className="text-xs">Initiate query to retrieve geolocation intelligence.</p>
               </div>
             )}
           </div>
         </div>
      </div>

      {/* Map Results Panel */}
      <div className="flex-1 bg-slate-950 p-8 overflow-y-auto">
         <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
           <MapPin className="text-green-500" />
           Identified Coordinates
         </h3>
         
         {mapData.length > 0 ? (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {mapData.map((chunk, i) => {
               if (!chunk.maps) return null;
               return (
                 <a 
                   key={i} 
                   href={chunk.maps.uri} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="group block bg-slate-900 border border-slate-800 hover:border-green-500/50 rounded-xl p-4 transition-all"
                 >
                    <div className="flex items-start justify-between mb-2">
                       <div className="p-2 bg-green-900/20 rounded-lg text-green-500">
                         <MapPin className="w-5 h-5" />
                       </div>
                       <ExternalLink className="w-4 h-4 text-slate-600 group-hover:text-green-400" />
                    </div>
                    <h4 className="font-bold text-white mb-1">{chunk.maps.title}</h4>
                    <p className="text-xs text-slate-400 truncate">{chunk.maps.uri}</p>
                 </a>
               );
             })}
           </div>
         ) : (
           <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-800 rounded-xl">
              <span className="text-slate-600 text-sm font-mono">NO GEOSPATIAL DATA DETECTED</span>
           </div>
         )}
      </div>
    </div>
  );
};

// Mock ExternalLink since I didn't import it above
const ExternalLink: React.FC<any> = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
);

export default VenueRecon;
