import React, { useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Lock,
  EyeOff,
  Database,
  UserCheck,
  CheckCircle2
} from 'lucide-react';

interface PrivacySecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacySecurityModal: React.FC<PrivacySecurityModalProps> = ({ isOpen, onClose }) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#E6E9EF] flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E6E9EF] flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EEF0FD] flex items-center justify-center text-[#5B5CE2] shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#172033] font-sans">Privacy & Data Security Architecture</h2>
              <p className="text-xs text-[#667085]">Zero-trust learner privacy and enterprise-grade security</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-600 font-sans leading-relaxed">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                <Lock className="w-4 h-4 text-[#5B5CE2]" />
                <span>Argon2id Password Hashing</span>
              </div>
              <p className="text-[11px] text-[#667085]">
                LearnLoop AI uses the Argon2id password-hashing algorithm (winner of the Password Hashing Competition). Passwords are cryptographically salted and hashed before persistence; plaintext passwords are never logged or stored.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                <EyeOff className="w-4 h-4 text-teal-600" />
                <span>HttpOnly JWT Cookie Storage</span>
              </div>
              <p className="text-[11px] text-[#667085]">
                Authentication refresh tokens are strictly stored in HttpOnly, SameSite=Lax cookies that cannot be accessed by client-side JavaScript, effectively neutralizing Cross-Site Scripting (XSS) token theft attacks.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                <Database className="w-4 h-4 text-indigo-600" />
                <span>Strict Multi-Tenant Isolation</span>
              </div>
              <p className="text-[11px] text-[#667085]">
                Every diagnostic attempt, concept mastery record, spaced repetition task, and AI Tutor conversation is strictly isolated to the authenticated learner. Insecure Direct Object Reference (IDOR) attacks are blocked by server-side identity resolution.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                <UserCheck className="w-4 h-4 text-amber-600" />
                <span>Role-Based Access Control (RBAC)</span>
              </div>
              <p className="text-[11px] text-[#667085]">
                Teacher analytics contain private class-wide telemetry. Student accounts are rejected with HTTP 403 Forbidden on educator endpoints, ensuring compliant adherence to educational privacy principles (FERPA & COPPA).
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-2">
            <h4 className="font-bold text-indigo-900 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              <span>Bounded AI Agent Safeguards</span>
            </h4>
            <p className="text-[11px] text-indigo-800/80">
              The AI Tutor and question generator operate inside strict pedagogical sandboxes with deterministic local fallbacks. Prompts enforce socratic guiding principles, prevent answer leaking, and reject unauthenticated context injections.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#E6E9EF] bg-slate-50/70 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#5B5CE2] hover:bg-[#494AC8] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
