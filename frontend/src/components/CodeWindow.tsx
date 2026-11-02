import React, { useState } from 'react';
import { Copy, Check, Terminal, ExternalLink, Sparkles } from 'lucide-react';

interface CodeWindowProps {
  title?: string;
  language?: string;
  code: string;
  onAskTutor?: (codeSnippet: string) => void;
  className?: string;
}

export const CodeWindow: React.FC<CodeWindowProps> = ({
  title = 'binary_search_invariant.py',
  language = 'python',
  code,
  onAskTutor,
  className = ''
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const lines = code.trim().split('\n');

  return (
    <div className={`overflow-hidden rounded-2xl bg-[#0F172A] border border-slate-800 shadow-xl font-mono text-xs ${className}`}>
      {/* Window Title Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 select-none">
        <div className="flex items-center gap-2">
          {/* Traffic light dots */}
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F] inline-block" />
          </div>
          <span className="text-[11px] text-slate-400 font-medium ml-2 flex items-center gap-1.5">
            <Terminal className="w-3 h-3 text-slate-500" />
            {title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">
            {language}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700/80 transition-colors cursor-pointer"
            title="Copy code snippet"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Code Body */}
      <div className="p-3.5 sm:p-4 overflow-x-auto text-[11px] sm:text-xs leading-relaxed text-slate-200">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                <td className="pr-4 text-right text-slate-600 select-none w-6 font-mono text-[10px]">
                  {idx + 1}
                </td>
                <td className="whitespace-pre font-mono">
                  {/* Basic syntax colorization */}
                  {line.startsWith('#') ? (
                    <span className="text-slate-500 italic">{line}</span>
                  ) : line.includes('def ') || line.includes('return ') || line.includes('while ') || line.includes('if ') || line.includes('else:') ? (
                    <span>
                      {line.split(' ').map((word, wIdx) => {
                        if (['def', 'return', 'while', 'if', 'else:', 'elif'].includes(word)) {
                          return <span key={wIdx} className="text-[#38B7A5] font-semibold">{word} </span>;
                        }
                        if (word.startsWith('"') || word.startsWith("'")) {
                          return <span key={wIdx} className="text-amber-300">{word} </span>;
                        }
                        return <span key={wIdx}>{word} </span>;
                      })}
                    </span>
                  ) : (
                    <span>{line}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Optional Socratic Tutor Hook */}
      {onAskTutor && (
        <div className="px-4 py-2 bg-slate-900/60 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-[#38B7A5]" />
            Wondering about this loop invariant?
          </span>
          <button
            onClick={() => onAskTutor(code)}
            className="text-[#38B7A5] hover:text-[#52d6c2] font-medium flex items-center gap-1 transition-colors cursor-pointer"
          >
            Ask Socratic AI &rarr;
          </button>
        </div>
      )}
    </div>
  );
};

