import React, { useEffect } from 'react';
import {
  X,
  HelpCircle,
  Keyboard,
  Cpu,
  Mic,
  Calendar,
  MessageSquare,
  GraduationCap
} from 'lucide-react';

interface HelpSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpSupportModal: React.FC<HelpSupportModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-[#E6E9EF] flex flex-col max-h-[calc(100dvh-1.5rem)] overflow-hidden">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#E6E9EF] flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EEF0FD] flex items-center justify-center text-[#5B5CE2] shadow-xs shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#172033] font-sans">Help & Pedagogical Guide</h2>
              <p className="text-xs text-[#667085]">Quick reference for features, agent tools, and keyboard shortcuts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs text-slate-600 font-sans leading-relaxed flex-1" data-lenis-prevent>
          {/* Shortcuts */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
              <Keyboard className="w-4 h-4 text-[#5B5CE2]" />
              <span>Keyboard Shortcuts</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-slate-700">
              <div className="flex justify-between border-b border-slate-200/60 py-1">
                <span>Close Modals / Drawers</span>
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded shadow-2xs font-semibold">Escape</kbd>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 py-1">
                <span>Submit Socratic Chat</span>
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded shadow-2xs font-semibold">Enter</kbd>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 py-1">
                <span>Multiline Input</span>
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded shadow-2xs font-semibold">Shift + Enter</kbd>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 py-1">
                <span>Select MCQ Options</span>
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded shadow-2xs font-semibold">Click / Space</kbd>
              </div>
            </div>
          </div>

          {/* Core Feature Reference */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-[#667085]">
              Core Architecture Reference
            </h4>

            <div className="p-3.5 rounded-xl border border-[#E6E9EF] flex items-start gap-3 bg-white">
              <Cpu className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800">7 Bounded Agent Tools:</span>
                <p className="text-[11px] text-[#667085] mt-0.5">
                  Every answer undergoes a structured agent pipeline: Profile Retrieval → Mastery Inspection → Misconception Evaluation → Model Updater → Spaced Repetition Scheduling → Model Update Verification.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-[#E6E9EF] flex items-start gap-3 bg-white">
              <Mic className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800">Wispr Flow & Voice Cleaning:</span>
                <p className="text-[11px] text-[#667085] mt-0.5">
                  You can dictate your answers or questions. The backend speech parser cleans filler disfluencies (&quot;um&quot;, &quot;like&quot;) and spoken self-corrections before processing your pedagogical query.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-[#E6E9EF] flex items-start gap-3 bg-white">
              <Calendar className="w-4 h-4 text-[#5B5CE2] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800">Spaced Repetition (Modified SM-2):</span>
                <p className="text-[11px] text-[#667085] mt-0.5">
                  Concepts with identified misconceptions or lower accuracy are automatically scheduled for timed review intervals (1, 3, 7, 14 days) to guarantee permanent memory consolidation.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-[#E6E9EF] bg-slate-50/70 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-[#5B5CE2] hover:bg-[#494AC8] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
