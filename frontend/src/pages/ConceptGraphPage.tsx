import React, { useState, useEffect } from 'react';
import { ConceptNode, ConceptEdge } from '../types';
import { api } from '../services/api';
import { ConceptGraphView } from '../components/ConceptGraphView';
import { FALLBACK_CONCEPTS, FALLBACK_EDGES } from '../services/syllabusData';
import { Network, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

interface ConceptGraphPageProps {
  onPracticeConcept: (conceptId: string) => void;
}

export const ConceptGraphPage: React.FC<ConceptGraphPageProps> = ({ onPracticeConcept }) => {
  const [concepts, setConcepts] = useState<ConceptNode[]>(FALLBACK_CONCEPTS);
  const [edges, setEdges] = useState<ConceptEdge[]>(FALLBACK_EDGES);
  const [loading, setLoading] = useState(false);
  const [isLiveSync, setIsLiveSync] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchGraph = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.getConcepts();
      if (data && Array.isArray(data.concepts) && data.concepts.length > 0) {
        setConcepts(data.concepts);
        setEdges(data.edges || FALLBACK_EDGES);
        setIsLiveSync(true);
      }
    } catch (err: any) {
      console.warn('Backend sync failed, using topological fallback graph', err);
      setIsLiveSync(false);
      setErrorMessage('Displaying standard DSA syllabus topology (offline mode).');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950 border border-purple-800 text-purple-300 text-xs font-mono mb-1.5">
            <Network className="w-3.5 h-3.5" />
            Topological Prerequisite Hierarchy
          </div>
          <h2 className="text-2xl font-bold font-mono text-white tracking-tight">
            Interactive DSA Concept Graph
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Visual graph mapping 12 core concepts, their prerequisite dependencies, and your live mastery state.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-edu-900 border border-edu-700 text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${isLiveSync ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span className={isLiveSync ? 'text-emerald-300' : 'text-amber-300'}>
              {isLiveSync ? 'Live Mastery Sync' : 'Syllabus Standalone'}
            </span>
          </div>

          <button
            onClick={fetchGraph}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-edu-900 hover:bg-edu-800 border border-edu-700 text-slate-300 text-xs font-mono transition-colors"
            title="Refresh Graph"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-400' : ''}`} />
            {loading ? 'Syncing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-edu-900/60 border border-edu-800 text-xs font-mono text-slate-400 flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={fetchGraph} className="text-purple-400 hover:underline">
            Retry Connection
          </button>
        </div>
      )}

      {/* Graph Visualizer */}
      <ConceptGraphView
        concepts={concepts}
        edges={edges}
        onSelectConcept={(cid) => console.log('Selected concept', cid)}
        onPracticeConcept={onPracticeConcept}
      />
    </div>
  );
};
