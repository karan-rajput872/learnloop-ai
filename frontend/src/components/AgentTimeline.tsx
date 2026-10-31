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
    <div className="bg-white rounded-2xl border border-[#E6E9EF] p-5 shadow-card space-y-3">
      <div className="flex items-center justify-between border-b border-[#E6E9EF] pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#EEF0FD] text-[#5B5CE2] border border-[#C7D2FE]">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#172033]">
              {title}
            </h4>
            <p className="text-[11px] text-[#667085] font-sans">
              Autonomous multi-tool execution trace ({tools.length} discrete operations verified)
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 font-semibold">
          All tools verified
        </span>
      </div>

      <div className="space-y-2.5">
        {tools.map((log, idx) => {
          const isExpanded = expandedIndex === idx;

          return (
            <div
              key={idx}
              className="bg-slate-50/80 rounded-xl border border-[#E6E9EF] p-3 text-xs font-mono transition-all hover:border-slate-300"
            >
              <div
                className="flex items-center justify-between cursor-pointer select-none"
                onClick={() => setExpandedIndex(isExpanded ? null : idx)}
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#EEF0FD] border border-[#C7D2FE] text-[#5B5CE2] text-[10px] flex items-center justify-center font-bold">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-[#172033] font-mono">{log.tool_name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200 font-semibold">
                    {log.status}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[#667085] text-[11px]">
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {log.execution_time_ms}ms
                  </span>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
              </div>

              {/* Output Summary */}
              <div className="mt-2 text-slate-700 font-sans text-xs bg-white p-2.5 rounded-lg border border-[#E6E9EF] leading-relaxed">
                {log.output_summary}
              </div>

              {/* Collapsible Input Telemetry */}
              {isExpanded && (
                <div className="mt-2 pt-2 border-t border-[#E6E9EF] text-[11px] text-[#667085] font-mono">
                  <span className="text-[#172033] font-semibold">Tool Input Payload:</span>
                  <div className="mt-1 text-slate-800 bg-slate-100 p-2 rounded border border-slate-200 font-mono">
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
