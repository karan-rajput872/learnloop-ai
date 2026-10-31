import React, { useState, useEffect } from 'react';
import { ConceptNode, ConceptEdge } from '../types';
import { api } from '../services/api';
import { ConceptGraphView } from '../components/ConceptGraphView';
import { Network, Sparkles, RefreshCw } from 'lucide-react';

interface ConceptGraphPageProps {
  onPracticeConcept: (conceptId: string) => void;
}

export const ConceptGraphPage: React.FC<ConceptGraphPageProps> = ({ onPracticeConcept }) => {
  const [concepts, setConcepts] = useState<ConceptNode[]>([]);
  const [edges, setEdges] = useState<ConceptEdge[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGraph = async () => {
    setLoading(true);
    try {
      const data = await api.getConcepts();
      setConcepts(data.concepts);
      setEdges(data.edges);
    } catch (err) {
      console.error('Failed to load concept graph', err);
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

        <button
          onClick={fetchGraph}
          disabled={loading}
          className="self-start sm:self-auto p-2.5 rounded-xl bg-edu-900 hover:bg-edu-800 border border-edu-700 text-slate-300 transition-colors"
          title="Refresh Graph"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
        </button>
      </div>

      {/* Graph Visualizer */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 font-mono text-sm bg-edu-900 rounded-2xl border border-edu-800 animate-pulse">
          Rendering interactive topological graph...
        </div>
      ) : (
        <ConceptGraphView
          concepts={concepts}
          edges={edges}
          onSelectConcept={(cid) => console.log('Selected concept', cid)}
          onPracticeConcept={onPracticeConcept}
        />
      )}
    </div>
  );
};
