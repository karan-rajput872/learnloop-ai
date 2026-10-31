import React, { useState, useRef } from 'react';
import { ConceptNode, ConceptEdge } from '../types';
import {
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  List,
  Network,
  X,
  Sparkles
} from 'lucide-react';

interface ConceptGraphViewProps {
  concepts: ConceptNode[];
  edges: ConceptEdge[];
  onSelectConcept: (conceptId: string) => void;
  onPracticeConcept: (conceptId: string) => void;
}

export const ConceptGraphView: React.FC<ConceptGraphViewProps> = ({
  concepts,
  edges,
  onSelectConcept,
  onPracticeConcept
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const conceptMap = new Map(concepts.map(c => [c.id, c]));

  const getMasteryColor = (pct: number) => {
    if (pct >= 70) return { stroke: '#10B981', fill: '#064E3B', text: '#34D399', bg: 'bg-emerald-950/80', border: 'border-emerald-600' };
    if (pct >= 40) return { stroke: '#F59E0B', fill: '#78350F', text: '#FBBF24', bg: 'bg-amber-950/80', border: 'border-amber-600' };
    return { stroke: '#A855F7', fill: '#4C1D95', text: '#C084FC', bg: 'bg-purple-950/80', border: 'border-purple-600' };
  };

  const selectedConcept = selectedId ? conceptMap.get(selectedId) : null;

  const handleZoomIn = () => setZoom(prev => Math.min(2.0, Number((prev + 0.15).toFixed(2))));
  const handleZoomOut = () => setZoom(prev => Math.max(0.6, Number((prev - 0.15).toFixed(2))));
  const handleResetZoom = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };
  const handleFitScreen = () => {
    setZoom(0.85);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Group concepts by category for mobile list view
  const categories: Record<string, ConceptNode[]> = {};
  concepts.forEach(c => {
    const cat = c.category || 'General';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(c);
  });

  return (
    <div className="bg-edu-900/90 rounded-2xl border border-edu-700/80 p-5 shadow-xl space-y-4">
      {/* Header with Mode Toggle & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edu-800 pb-3">
        <div>
          <h3 className="text-sm font-bold font-mono uppercase text-white tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-loop-purple" />
            DSA Syllabus Prerequisite Hierarchy (12 Concepts)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {viewMode === 'graph'
              ? 'Pan, zoom, or click any node to inspect prerequisite relations and mastery state.'
              : 'Categorized list view with prerequisite readiness indicators.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle Button */}
          <div className="flex items-center p-1 bg-edu-950 border border-edu-800 rounded-xl text-xs font-mono">
            <button
              onClick={() => setViewMode('graph')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors ${viewMode === 'graph' ? 'bg-purple-950 text-purple-300 font-bold border border-purple-800' : 'text-slate-400 hover:text-white'
                }`}
            >
              <Network className="w-3.5 h-3.5" />
              Graph View
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-purple-950 text-purple-300 font-bold border border-purple-800' : 'text-slate-400 hover:text-white'
                }`}
            >
              <List className="w-3.5 h-3.5" />
              List View
            </button>
          </div>

          {/* Legend */}
          <div className="hidden sm:flex items-center gap-2.5 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              Novice
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Developing
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Mastered
            </span>
          </div>
        </div>
      </div>

      {/* VIEW 1: Interactive SVG Graph with Pan & Zoom */}
      {viewMode === 'graph' && (
        <div className="relative w-full overflow-hidden bg-edu-950 rounded-xl border border-edu-800 select-none">
          {/* Zoom & Pan Floating Controls Bar */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-edu-900/90 backdrop-blur-md border border-edu-700/80 p-1.5 rounded-xl shadow-lg text-xs font-mono">
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg hover:bg-edu-800 text-slate-300 hover:text-white transition-colors"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg hover:bg-edu-800 text-slate-300 hover:text-white transition-colors"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 rounded-lg hover:bg-edu-800 text-slate-300 hover:text-white transition-colors"
              title="Reset Zoom (100%)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handleFitScreen}
              className="p-1.5 rounded-lg hover:bg-edu-800 text-slate-300 hover:text-white transition-colors"
              title="Fit to Screen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <span className="px-2 py-0.5 text-[10px] text-purple-300 font-bold bg-edu-950 rounded border border-purple-800">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          <div
            className={`w-full h-[580px] overflow-hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <svg
              viewBox="0 0 780 660"
              className="w-full h-full min-w-[720px] transition-transform duration-75 origin-top-left"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
              }}
            >
              {/* Arrowhead marker definition */}
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="8"
                  markerHeight="6"
                  refX="7"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 8 3, 0 6" fill="#475569" />
                </marker>
              </defs>

              {/* Render Prerequisite Directed Edges */}
              {edges.map((edge, idx) => {
                const fromNode = conceptMap.get(edge.from);
                const toNode = conceptMap.get(edge.to);
                if (!fromNode || !toNode) return null;

                const x1 = fromNode.graph_position.x + 55;
                const y1 = fromNode.graph_position.y + 25;
                const x2 = toNode.graph_position.x + 55;
                const y2 = toNode.graph_position.y + 25;

                const dx = x2 - x1;
                const dy = y2 - y1;
                const cx = x1 + dx * 0.5;
                const cy = y1 + dy * 0.5 - 15;

                return (
                  <path
                    key={idx}
                    d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
                    fill="none"
                    stroke="#334155"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                    markerEnd="url(#arrowhead)"
                  />
                );
              })}

              {/* Render 12 Concept Nodes */}
              {concepts.map((concept) => {
                const isSelected = selectedId === concept.id;
                const colors = getMasteryColor(concept.mastery_percentage);
                const x = concept.graph_position.x;
                const y = concept.graph_position.y;

                return (
                  <g
                    key={concept.id}
                    transform={`translate(${x}, ${y})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId(concept.id);
                      onSelectConcept(concept.id);
                    }}
                    className="cursor-pointer group"
                  >
                    <rect
                      width="110"
                      height="50"
                      rx="10"
                      fill="#0B1120"
                      stroke={isSelected ? '#C084FC' : colors.stroke}
                      strokeWidth={isSelected ? '3' : '2'}
                      filter={isSelected ? 'drop-shadow(0 0 10px rgba(168, 85, 247, 0.5))' : ''}
                      className="transition-all duration-200 group-hover:brightness-125"
                    />

                    <text
                      x="55"
                      y="22"
                      textAnchor="middle"
                      fill="#F8FAFC"
                      fontSize="11"
                      fontWeight="bold"
                      fontFamily="Inter, sans-serif"
                    >
                      {concept.name}
                    </text>

                    <text
                      x="55"
                      y="38"
                      textAnchor="middle"
                      fill={colors.text}
                      fontSize="10"
                      fontWeight="600"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {concept.mastery_percentage}% Mastery
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* VIEW 2: Mobile-Friendly Categorized Concept List */}
      {viewMode === 'list' && (
        <div className="space-y-4 animate-fade-in">
          {Object.entries(categories).map(([catName, catConcepts]) => (
            <div key={catName} className="p-4 rounded-xl bg-edu-950 border border-edu-800 space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-purple-300">
                {catName}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {catConcepts.map(c => {
                  const colors = getMasteryColor(c.mastery_percentage);
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedId(c.id);
                        onSelectConcept(c.id);
                      }}
                      className={`p-3 rounded-xl bg-edu-900 border cursor-pointer transition-all ${selectedId === c.id ? 'border-purple-500 shadow-md shadow-purple-500/20' : 'border-edu-800 hover:border-edu-700'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-white font-mono">{c.name}</span>
                        <span className={`text-xs font-mono font-bold ${c.mastery_percentage >= 70 ? 'text-emerald-400' :
                            c.mastery_percentage >= 40 ? 'text-amber-400' : 'text-purple-400'
                          }`}>
                          {c.mastery_percentage}%
                        </span>
                      </div>

                      <div className="h-1.5 w-full bg-edu-950 rounded-full overflow-hidden my-2">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-loop-blue rounded-full"
                          style={{ width: `${c.mastery_percentage}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span>Prereqs: <strong className="text-slate-300">{c.prerequisites.length > 0 ? c.prerequisites.join(', ') : 'None'}</strong></span>
                        <span className="text-purple-300 uppercase">{c.current_difficulty}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected Concept Detail Drawer */}
      {selectedConcept && (
        <div className="p-4 rounded-xl bg-edu-950 border border-purple-800/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in relative">
          <button
            onClick={() => setSelectedId(null)}
            className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-edu-850 transition-colors"
            title="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="space-y-1.5 flex-1 pr-6">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
                {selectedConcept.category}
              </span>
              <h4 className="text-base font-bold text-white font-mono">{selectedConcept.name}</h4>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                {selectedConcept.mastery_percentage}% Mastery
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {selectedConcept.description}
            </p>

            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-400 pt-1">
              <span>Prerequisites: <strong className="text-slate-200">{selectedConcept.prerequisites.length > 0 ? selectedConcept.prerequisites.join(', ') : 'None (Foundational)'}</strong></span>
              <span>•</span>
              <span>Difficulty: <strong className="text-purple-300 uppercase">{selectedConcept.current_difficulty}</strong></span>
              <span>•</span>
              <span>Questions Practiced: <strong className="text-slate-200">{selectedConcept.questions_attempted}</strong></span>
            </div>
          </div>

          <button
            onClick={() => onPracticeConcept(selectedConcept.id)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-loop-purple to-loop-indigo hover:from-purple-500 hover:to-indigo-500 text-white font-mono font-bold text-xs shadow-lg shadow-purple-500/20 transition-all shrink-0"
          >
            Practice {selectedConcept.name}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
