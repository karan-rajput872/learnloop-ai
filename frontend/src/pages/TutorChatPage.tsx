import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { WisprFlowDictaphone } from '../components/WisprFlowDictaphone';
import { AgentTimeline } from '../components/AgentTimeline';
import { AgentToolLog } from '../types';
import {
  MessageSquare,
  Bot,
  User,
  Sparkles,
  Volume2,
  Lightbulb,
  Palette,
  Code,
  Brain,
  Smile,
  Loader2,
  Camera
} from 'lucide-react';

interface TutorChatPageProps {
  onOpenLiveVideo?: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  speechMetadata?: {
    original_transcript: string;
    cleaned_query: string;
    filler_words_removed: string[];
    self_corrections_resolved: string[];
    digressions_identified: string[];
  };
}

const DSA_CONCEPT_OPTIONS = [
  { id: 'stacks', name: 'Stacks (LIFO)' },
  { id: 'queues', name: 'Queues (FIFO)' },
  { id: 'binary_trees', name: 'Binary Search Trees' },
  { id: 'recursion', name: 'Recursion' },
  { id: 'linked_lists', name: 'Linked Lists' },
  { id: 'time_complexity', name: 'Time Complexity' },
  { id: 'space_complexity', name: 'Space Complexity' },
  { id: 'arrays', name: 'Arrays' },
  { id: 'searching', name: 'Searching' },
  { id: 'sorting', name: 'Sorting' },
  { id: 'trees', name: 'Trees' },
  { id: 'graphs', name: 'Graphs' }
];

export const TutorChatPage: React.FC<TutorChatPageProps> = ({ onOpenLiveVideo }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init_1',
      role: 'assistant',
      content: "Hello! I am your LearnLoop AI tutor. You can speak to me naturally using Wispr Flow dictation—don't worry about conversational filler words, self-corrections, or digressions! What DSA concept would you like to master today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeConcept, setActiveConcept] = useState<string>('stacks');
  const [latestTools, setLatestTools] = useState<AgentToolLog[]>([]);

  // Restore persistent conversation history from SQLite on mount
  useEffect(() => {
    api.getChatMessages()
      .then((data) => {
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            speechMetadata: m.metadata?.speech_metadata
          })));
        }
      })
      .catch((err) => console.error('Could not restore chat history', err));
  }, []);

  const handleSendTranscript = async (transcript: string) => {
    if (!transcript.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: transcript,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const data = await api.tutorChat(transcript);
      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        speechMetadata: data.speech_metadata
      };

      setMessages(prev => [...prev, assistantMsg]);
      setLatestTools(data.tools_executed || []);
    } catch (err) {
      console.error('Tutor chat failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTutorAction = async (actionType: string) => {
    if (actionLoading || loading) return;
    setActionLoading(actionType);

    try {
      const data = await api.tutorAction(activeConcept, actionType);
      const content = data.formatted_content || data.content;

      const assistantMsg: ChatMessage = {
        id: `act_${Date.now()}`,
        role: 'assistant',
        content: content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error(`Tutor action '${actionType}' failed`, err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF0FD] border border-[#C7D2FE] text-[#5B5CE2] text-xs font-mono font-medium mb-1.5">
            <Volume2 className="w-3.5 h-3.5" />
            Wispr Flow Dictation Integrated
          </div>
          <h2 className="text-2xl font-bold font-sans text-[#172033] tracking-tight">
            AI Concept Tutor
          </h2>
          <p className="text-xs sm:text-sm text-[#667085] mt-0.5 font-sans">
            Conversational tutoring that tolerates speech disfluencies and isolates the underlying algorithmic reasoning.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenLiveVideo && (
            <button
              type="button"
              onClick={onOpenLiveVideo}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-[#5B5CE2] to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs font-bold shadow-xs transition-all transform hover:scale-105 cursor-pointer"
              title="Inspect handwritten code, diagrams, or whiteboard sketches using your camera"
            >
              <Camera className="w-3.5 h-3.5 text-indigo-200" />
              <span>Explore Live Video</span>
            </button>
          )}

          {/* Concept Selector for Quick Socratic Actions */}
          <div className="flex items-center gap-2 bg-white border border-[#E6E9EF] p-2 rounded-xl text-xs font-mono shadow-xs">
          <span className="text-[#667085]">Focus Topic:</span>
          <select
            value={activeConcept}
            onChange={(e) => setActiveConcept(e.target.value)}
            className="bg-slate-50 border border-[#E6E9EF] text-[#5B5CE2] font-semibold rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-[#5B5CE2]"
          >
            {DSA_CONCEPT_OPTIONS.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          </div>
        </div>
      </div>

      {/* Socratic Quick-Actions Toolbar */}
      <div className="p-3.5 rounded-2xl bg-white border border-[#E6E9EF] shadow-card space-y-2.5">
        <div className="flex items-center justify-between text-[11px] font-mono text-[#667085]">
          <span className="flex items-center gap-1.5 font-semibold text-[#172033] uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#5B5CE2]" />
            Interactive Socratic Tutor Actions:
          </span>
          <span>Topic: <strong className="text-[#5B5CE2] uppercase">{activeConcept}</strong></span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleTutorAction('hint')}
            disabled={Boolean(actionLoading) || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-medium transition-colors disabled:opacity-50"
          >
            {actionLoading === 'hint' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lightbulb className="w-3.5 h-3.5 text-amber-600" />}
            Give me a hint
          </button>

          <button
            onClick={() => handleTutorAction('analogy')}
            disabled={Boolean(actionLoading) || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EEF0FD] hover:bg-indigo-100 border border-[#C7D2FE] text-[#5B5CE2] text-xs font-medium transition-colors disabled:opacity-50"
          >
            {actionLoading === 'analogy' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Palette className="w-3.5 h-3.5 text-[#5B5CE2]" />}
            Explain with an analogy
          </button>

          <button
            onClick={() => handleTutorAction('worked_example')}
            disabled={Boolean(actionLoading) || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 text-xs font-medium transition-colors disabled:opacity-50"
          >
            {actionLoading === 'worked_example' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Code className="w-3.5 h-3.5 text-sky-600" />}
            Show a worked example
          </button>

          <button
            onClick={() => handleTutorAction('socratic_challenge')}
            disabled={Boolean(actionLoading) || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 text-xs font-medium transition-colors disabled:opacity-50"
          >
            {actionLoading === 'socratic_challenge' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5 text-teal-600" />}
            Test my understanding
          </button>

          <button
            onClick={() => handleTutorAction('explain_simple')}
            disabled={Boolean(actionLoading) || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs font-medium transition-colors disabled:opacity-50"
          >
            {actionLoading === 'explain_simple' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Smile className="w-3.5 h-3.5 text-slate-600" />}
            Explain more simply
          </button>
        </div>
      </div>

      {/* Dictaphone Input Unit */}
      <WisprFlowDictaphone
        onTranscriptReady={handleSendTranscript}
        isLoading={loading || Boolean(actionLoading)}
      />

      {/* Chat Thread */}
      <div className="bg-white rounded-2xl border border-[#E6E9EF] p-5 shadow-card space-y-4 max-h-[500px] overflow-y-auto">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-3 text-xs sm:text-sm leading-relaxed ${
              m.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {m.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-[#EEF0FD] border border-[#C7D2FE] text-[#5B5CE2] flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div className={`max-w-[85%] rounded-2xl p-4 space-y-2 ${
              m.role === 'user'
                ? 'bg-[#5B5CE2] text-white rounded-tr-none'
                : 'bg-slate-50 border border-[#E6E9EF] text-slate-900 rounded-tl-none font-sans'
            }`}>
              <div className="flex items-center justify-between gap-2 border-b border-black/5 pb-1.5 text-[11px] font-mono opacity-80">
                <span className="font-semibold">{m.role === 'user' ? 'You (Wispr Flow Voice)' : 'LearnLoop AI Tutor'}</span>
                <span>{m.timestamp}</span>
              </div>

              {/* Message text with pre-wrap formatting */}
              <div className="whitespace-pre-wrap">{m.content}</div>

              {/* Wispr Flow Disfluency Telemetry Card if assistant */}
              {m.speechMetadata && (
                <div className="mt-3 pt-2.5 border-t border-[#E6E9EF] text-[11px] font-mono text-[#667085] space-y-1 bg-white p-2.5 rounded-lg border border-[#E6E9EF]">
                  <div className="flex items-center gap-1.5 text-[#5B5CE2] font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    Wispr Flow Speech Cleanup Breakdown:
                  </div>

                  {m.speechMetadata.filler_words_removed.length > 0 && (
                    <div>
                      <span className="text-slate-400">Removed Fillers:</span>{' '}
                      <span className="text-rose-700 font-semibold">{m.speechMetadata.filler_words_removed.join(', ')}</span>
                    </div>
                  )}

                  {m.speechMetadata.self_corrections_resolved.length > 0 && (
                    <div>
                      <span className="text-slate-400">Resolved Corrections:</span>{' '}
                      <span className="text-teal-700 font-semibold">{m.speechMetadata.self_corrections_resolved.join('; ')}</span>
                    </div>
                  )}

                  {m.speechMetadata.digressions_identified.length > 0 && (
                    <div>
                      <span className="text-slate-400">Isolated Digressions:</span>{' '}
                      <span className="text-amber-700 font-semibold">{m.speechMetadata.digressions_identified.join('; ')}</span>
                    </div>
                  )}

                  <div>
                    <span className="text-slate-400">Distilled Algorithmic Query:</span>{' '}
                    <span className="text-[#172033] font-sans italic font-medium">&quot;{m.speechMetadata.cleaned_query}&quot;</span>
                  </div>
                </div>
              )}
            </div>

            {m.role === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-slate-200 border border-slate-300 text-slate-700 flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {(loading || actionLoading) && (
          <div className="flex items-center gap-2 text-xs font-mono text-[#5B5CE2] p-3 bg-[#EEF0FD]/60 rounded-xl border border-[#C7D2FE] animate-pulse">
            <Bot className="w-4 h-4" />
            {actionLoading ? `Generating Socratic ${actionLoading.replace('_', ' ')}...` : 'Agent parsing conversational speech and retrieving conceptual invariants...'}
          </div>
        )}
      </div>

      {/* Visible Agent Activity Timeline */}
      {latestTools.length > 0 && (
        <AgentTimeline
          tools={latestTools}
          title="Tutor Agent Pipeline Execution Trace"
        />
      )}

    </div>
  );
};
