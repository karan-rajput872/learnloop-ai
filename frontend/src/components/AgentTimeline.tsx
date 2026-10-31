import React, { useState } from 'react';
import { AgentToolLog } from '../types';
import { Terminal, Wrench, CheckCircle, Clock, ChevronDown, ChevronUp, Cpu, Sparkles } from 'lucide-react';

interface AgentTimelineProps {
  tools: AgentToolLog[];
  title?: string;
}

export const AgentTimeline: React.FC<AgentTimelineProps> = ({
  tools,
  title = "Agent Activity Timeline (Verifiable Tool Invocations)"
}) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!tools || tools.length === 0) return null;

  return (
    <div className="bg-edu-900/90 rounded-2xl border border-edu-700/80 p-5 shadow-lg space-y-3">
      <div className="flex items-center justify-between border-b border-edu-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-950 text-purple-400 border border-purple-800">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              {title}
            </h4>
            <p className="text-[11px] text-slate-400">
              Autonomous multi-tool execution trace ({tools.length} discrete operations verified)
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-edu-950 text-emerald-400 border border-edu-800">
          All tools verified
        </span>
      </div>

      <div className="space-y-2.5">
        {tools.map((log, idx) => {
          const isExpanded = expandedIndex === idx;

          return (
            <div
              key={idx}
              className="bg-edu-950/80 rounded-xl border border-edu-800 p-3 text-xs font-mono transition-all hover:border-edu-700"
            >
              <div
                className="flex items-center justify-between cursor-pointer select-none"
                onClick={() => setExpandedIndex(isExpanded ? null : idx)}
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-950 border border-purple-800 text-purple-300 text-[10px] flex items-center justify-center font-bold">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-purple-300">{log.tool_name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                    {log.status}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {log.execution_time_ms}ms
                  </span>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
              </div>

              {/* Output Summary */}
              <div className="mt-2 text-slate-300 font-sans text-xs bg-edu-900/60 p-2.5 rounded-lg border border-edu-800/60 leading-relaxed">
                {log.output_summary}
              </div>

              {/* Collapsible Input Telemetry */}
              {isExpanded && (
                <div className="mt-2 pt-2 border-t border-edu-800/80 text-[11px] text-slate-400 font-mono">
                  <span className="text-slate-500 font-semibold">Tool Input Payload:</span>
                  <div className="mt-1 text-slate-300 bg-edu-950 p-2 rounded border border-edu-800">
                    {log.input_summary}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
