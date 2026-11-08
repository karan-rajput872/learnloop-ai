import React, { useEffect } from 'react';
import { X, FileText, CheckCircle2 } from 'lucide-react';

interface TermsPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsPrivacyModal: React.FC<TermsPrivacyModalProps> = ({ isOpen, onClose }) => {
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
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#172033] font-sans">Terms of Service & Privacy Policy</h2>
              <p className="text-xs text-[#667085]">Educational use terms, privacy commitments, and data ownership</p>
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
          <div className="space-y-3">
            <h3 className="font-bold text-slate-800 text-sm">1. Terms of Educational Service</h3>
            <p>
              LearnLoop AI is an adaptive examination preparation tutor developed for university students, job seekers, and independent learners. By accessing or using the platform, you agree to engage in academic integrity and honest diagnostic assessment.
            </p>

            <h3 className="font-bold text-slate-800 text-sm mt-4">2. Privacy & Learner Telemetry Ownership</h3>
            <p>
              Your concept mastery data, diagnostic reviews, and reasoning logs belong to you. We do not sell your personal data or learning records. Your diagnostic scores are utilized exclusively to personalize questions, adapt difficulty, and trigger socratic tutor explanations.
            </p>

            <h3 className="font-bold text-slate-800 text-sm mt-4">3. FERPA & Multi-User Isolation</h3>
            <p>
              Under educational privacy regulations (FERPA), student learning records are confidential. Students are restricted from accessing teacher dashboards or classmates&apos; performance telemetry. All cross-user data is strictly segregated via server-side identity checks.
            </p>

            <h3 className="font-bold text-slate-800 text-sm mt-4">4. AI Provider Transparency</h3>
            <p>
              LearnLoop AI utilizes Gemini 2.5 Flash for advanced pedagogical dialogues and provides a local deterministic fallback engine when cloud APIs are unavailable. AI outputs are framed socratically to promote conceptual understanding rather than merely supplying code solutions.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-[#E6E9EF] bg-slate-50/70 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-[#5B5CE2] hover:bg-[#494AC8] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            I Accept & Understand
          </button>
        </div>
      </div>
    </div>
  );
};
