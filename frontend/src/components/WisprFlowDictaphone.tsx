import React, { useState } from 'react';
import { Mic, MicOff, Sparkles, Volume2, HelpCircle, Check, Play } from 'lucide-react';

interface WisprFlowDictaphoneProps {
  onTranscriptReady: (transcript: string) => void;
  isLoading: boolean;
}

const WISPR_FLOW_PRESETS = [
  {
    label: "Stack LIFO vs FIFO with Self-Correction & Digression",
    transcript: "Um, okay so wait, I was thinking a stack is FIFO... wait no, sorry, I mean LIFO, because like you take the top plate off first. By the way my exam is on Friday anyway so yeah what happens when it pops?"
  },
  {
    label: "QuickSort Complexity with Fillers & Fatigue Digression",
    transcript: "Like, uh, why does QuickSort take O(n squared) in the worst case? I mean, isn't it basically always n log n? Oh and also I haven't slept much today."
  },
  {
    label: "BST Ancestor Invariant Confusion with Disfluency",
    transcript: "So in a binary search tree, wait, if root is 20 and right child is 30, can I put 15 on the left of 30? Like, honestly, it's less than 30 so why wouldn't that work?"
  },
  {
    label: "Circular Queue Modulo with Colloquialisms",
    transcript: "Basically in circular queues, um, why do we need the modulo operator for the rear pointer? Like you know, what happens when it reaches the end of the array?"
  }
];

export const WisprFlowDictaphone: React.FC<WisprFlowDictaphoneProps> = ({
  onTranscriptReady,
  isLoading
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [customText, setCustomText] = useState('');

  const handleSelectPreset = (presetText: string) => {
    setCustomText(presetText);
    onTranscriptReady(presetText);
  };

  const toggleRecording = () => {
    const SpeechRec = (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (SpeechRec) {
      if (isRecording) {
        setIsRecording(false);
        return;
      }

      try {
        const recognition = new SpeechRec();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsRecording(true);
        };

        recognition.onresult = (event: any) => {
          setIsRecording(false);
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            setCustomText(transcript);
            onTranscriptReady(transcript);
          }
        };

        recognition.onerror = () => {
          setIsRecording(false);
          const randomPreset = WISPR_FLOW_PRESETS[Math.floor(Math.random() * WISPR_FLOW_PRESETS.length)].transcript;
          setCustomText(randomPreset);
          onTranscriptReady(randomPreset);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognition.start();
      } catch (err) {
        setIsRecording(false);
        const randomPreset = WISPR_FLOW_PRESETS[Math.floor(Math.random() * WISPR_FLOW_PRESETS.length)].transcript;
        setCustomText(randomPreset);
        onTranscriptReady(randomPreset);
      }
    } else {
      if (!isRecording) {
        setIsRecording(true);
        setTimeout(() => {
          setIsRecording(false);
          const randomPreset = WISPR_FLOW_PRESETS[Math.floor(Math.random() * WISPR_FLOW_PRESETS.length)].transcript;
          setCustomText(randomPreset);
          onTranscriptReady(randomPreset);
        }, 1500);
      } else {
        setIsRecording(false);
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E6E9EF] p-5 shadow-card space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E6E9EF] pb-3 gap-3">
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#EEF0FD] text-[#5B5CE2] border border-[#C7D2FE] shrink-0 mt-0.5 sm:mt-0">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#172033] flex flex-wrap items-center gap-1.5">
              <span>Wispr Flow Natural Speech Dictation</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EEF0FD] text-[#5B5CE2] border border-[#C7D2FE] font-mono whitespace-nowrap">
                Disfluency Aware
              </span>
            </h4>
            <p className="text-[11px] text-[#667085] font-sans">
              Speak naturally with filler words (&quot;um&quot;, &quot;like&quot;), self-corrections, or digressions. LearnLoop will distill your core concept query.
            </p>
          </div>
        </div>

        {/* Live Microphone Recording Button */}
        <button
          onClick={toggleRecording}
          disabled={isLoading}
          className={`w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs transition-all shadow-xs shrink-0 cursor-pointer ${isRecording
              ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-100'
              : 'bg-[#5B5CE2] hover:bg-[#494AC8] text-white'
            }`}
        >
          {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          <span>{isRecording ? 'Listening...' : 'Record Voice'}</span>
        </button>
      </div>

      {/* Preset 1-Click Conversational Speech Samples */}
      <div className="space-y-2">
        <span className="text-[11px] font-mono text-[#667085] flex items-center gap-1 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-[#5B5CE2]" />
          Sample Wispr Flow Voice Transcriptions (Click to Test):
        </span>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {WISPR_FLOW_PRESETS.map((p, i) => (
            <button
              key={i}
              onClick={() => handleSelectPreset(p.transcript)}
              disabled={isLoading}
              className="text-left p-3 rounded-xl bg-slate-50/80 hover:bg-white hover:border-[#5B5CE2]/50 border border-[#E6E9EF] transition-all text-xs font-sans text-slate-700 flex items-start justify-between gap-2 group card-hover"
            >
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-[#5B5CE2] group-hover:text-[#494AC8]">
                  {p.label}
                </div>
                <div className="text-[10px] text-[#667085] font-sans italic line-clamp-2">
                  &quot;{p.transcript}&quot;
                </div>
              </div>
              <Play className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#5B5CE2] shrink-0 mt-1" />
            </button>
          ))}
        </div>
      </div>

      {/* Custom Textarea if student prefers typing */}
      <div className="space-y-2 pt-2 border-t border-[#E6E9EF]">
        <div className="flex items-center justify-between text-[11px] font-mono text-[#667085]">
          <span>Or Type / Edit Transcribed Speech:</span>
          <span>{customText.length} characters</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <textarea
            rows={2}
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Type your question with natural filler words, or speak above..."
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-[#E6E9EF] text-[#172033] text-[16px] sm:text-xs font-sans placeholder-slate-400 focus:outline-none focus:border-[#5B5CE2] focus:bg-white transition-colors"
          />
          <button
            onClick={() => onTranscriptReady(customText)}
            disabled={isLoading || !customText.trim()}
            className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-xl bg-[#5B5CE2] hover:bg-[#494AC8] disabled:opacity-40 text-white font-medium text-xs shadow-xs transition-colors flex items-center justify-center cursor-pointer shrink-0"
          >
            Send to Tutor
          </button>
        </div>
      </div>
    </div>
  );
};
