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
    if (pct >= 70) {
      return { stroke: '#0F9F91', fill: '#FFFFFF', text: '#0F9F91', pillBg: '#E6F7F5', pillBorder: '#99F6E4' };
    }
    if (pct >= 40) {
      return { stroke: '#D99027', fill: '#FFFFFF', text: '#D99027', pillBg: '#FEF7ED', pillBorder: '#FED7AA' };
    }
    return { stroke: '#5B5CE2', fill: '#FFFFFF', text: '#5B5CE2', pillBg: '#EEF0FD', pillBorder: '#C7D2FE' };
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
    <div className="bg-white rounded-2xl border border-[#E6E9EF] p-5 shadow-card space-y-4">
      {/* Header with Mode Toggle & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E6E9EF] pb-3">
        <div>
          <h3 className="text-sm font-bold font-sans text-[#172033] tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#5B5CE2]" />
            DSA Syllabus Prerequisite Hierarchy (12 Concepts)
          </h3>
          <p className="text-xs text-[#667085] mt-0.5 font-sans">
            {viewMode === 'graph'
              ? 'Pan, zoom, or click any node to inspect prerequisite relations and mastery state.'
              : 'Categorized list view with prerequisite readiness indicators.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle Button */}
          <div className="flex items-center p-1 bg-slate-50 border border-[#E6E9EF] rounded-xl text-xs font-mono">
            <button
              onClick={() => setViewMode('graph')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors ${
                viewMode === 'graph' ? 'bg-[#EEF0FD] text-[#5B5CE2] font-bold border border-[#C7D2FE]' : 'text-[#667085] hover:text-[#172033]'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              Graph View
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-[#EEF0FD] text-[#5B5CE2] font-bold border border-[#C7D2FE]' : 'text-[#667085] hover:text-[#172033]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              List View
            </button>
          </div>

          {/* Legend */}
          <div className="hidden sm:flex items-center gap-2.5 text-[11px] font-mono text-[#667085]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#5B5CE2]" />
              Novice
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Developing
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
              Mastered
            </span>
          </div>
        </div>
      </div>

      {/* VIEW 1: Interactive SVG Graph with Pan & Zoom */}
      {viewMode === 'graph' && (
        <div className="relative w-full overflow-hidden bg-[#F8FAFC] rounded-xl border border-[#E6E9EF] select-none">
          {/* Zoom & Pan Floating Controls Bar */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-white/95 backdrop-blur-md border border-[#E6E9EF] p-1.5 rounded-xl shadow-sm text-xs font-mono">
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors"
              title="Reset Zoom (100%)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handleFitScreen}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors"
              title="Fit to Screen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <span className="px-2 py-0.5 text-[10px] text-[#5B5CE2] font-bold bg-[#EEF0FD] rounded border border-[#C7D2FE]">
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
                  <polygon points="0 0, 8 3, 0 6" fill="#94A3B8" />
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
                    stroke="#CBD5E1"
                    strokeWidth="1.75"
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
                      fill="#FFFFFF"
                      stroke={isSelected ? '#5B5CE2' : colors.stroke}
                      strokeWidth={isSelected ? '2.5' : '1.5'}
                      filter="drop-shadow(0 1px 2px rgba(16, 24, 40, 0.05))"
                      className="transition-all duration-150"
                    />

                    <text
                      x="55"
                      y="22"
                      textAnchor="middle"
                      fill="#172033"
                      fontSize="11"
                      fontWeight="600"
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
            <div key={catName} className="p-4 rounded-xl bg-slate-50/70 border border-[#E6E9EF] space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#5B5CE2]">
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
                      className={`p-3 rounded-xl bg-white border cursor-pointer transition-all ${
                        selectedId === c.id ? 'border-[#5B5CE2] shadow-sm' : 'border-[#E6E9EF] hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-[#172033] font-sans">{c.name}</span>
                        <span className={`text-xs font-mono font-bold ${
                          c.mastery_percentage >= 70 ? 'text-teal-700' :
                          c.mastery_percentage >= 40 ? 'text-amber-700' : 'text-[#5B5CE2]'
                        }`}>
                          {c.mastery_percentage}%
                        </span>
                      </div>

                      <div className="h-1.5 w-full bg-[#E6E9EF] rounded-full overflow-hidden my-2">
                        <div
                          className={`h-full rounded-full ${
                            c.mastery_percentage >= 70 ? 'bg-teal-500' :
                            c.mastery_percentage >= 40 ? 'bg-amber-500' : 'bg-[#5B5CE2]'
                          }`}
                          style={{ width: `${c.mastery_percentage}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-mono text-[#667085]">
                        <span>Prereqs: <strong className="text-[#172033]">{c.prerequisites.length > 0 ? c.prerequisites.join(', ') : 'None'}</strong></span>
                        <span className="text-[#5B5CE2] uppercase font-semibold">{c.current_difficulty}</span>
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
        <div className="p-4 rounded-xl bg-slate-50 border border-[#C7D2FE] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in relative shadow-sm">
          <button
            onClick={() => setSelectedId(null)}
            className="absolute top-3 right-3 p-1 rounded-lg text-[#667085] hover:text-[#172033] hover:bg-slate-200/60 transition-colors"
            title="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="space-y-1.5 flex-1 pr-6">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold uppercase px-2.5 py-0.5 rounded-full bg-[#EEF0FD] text-[#5B5CE2] border border-[#C7D2FE]">
                {selectedConcept.category}
              </span>
              <h4 className="text-base font-bold text-[#172033] font-sans">{selectedConcept.name}</h4>
              <span className="text-xs font-mono text-teal-700 font-bold">
                {selectedConcept.mastery_percentage}% Mastery
              </span>
            </div>

            <p className="text-xs text-[#667085] leading-relaxed font-sans">
              {selectedConcept.description}
            </p>

            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-[#667085] pt-1">
              <span>Prerequisites: <strong className="text-[#172033]">{selectedConcept.prerequisites.length > 0 ? selectedConcept.prerequisites.join(', ') : 'None (Foundational)'}</strong></span>
              <span>•</span>
              <span>Difficulty: <strong className="text-[#5B5CE2] uppercase">{selectedConcept.current_difficulty}</strong></span>
              <span>•</span>
              <span>Questions Practiced: <strong className="text-[#172033]">{selectedConcept.questions_attempted}</strong></span>
            </div>
          </div>

          <button
            onClick={() => onPracticeConcept(selectedConcept.id)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5B5CE2] hover:bg-[#494AC8] text-white font-medium text-xs shadow-sm transition-all shrink-0"
          >
            Practice {selectedConcept.name}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
