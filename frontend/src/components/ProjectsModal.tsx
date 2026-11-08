import React from 'react';
import {
  X,
  FolderGit2,
  Code2,
  Terminal,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { LearnerProfile } from '../types';

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: LearnerProfile | null;
  onOpenTutor?: (prompt?: string) => void;
}

export const ProjectsModal: React.FC<ProjectsModalProps> = ({
  isOpen,
  onClose,
  profile,
  onOpenTutor
}) => {
  if (!isOpen) return null;

  const projects = [
    {
      id: 'lru_cache',
      title: 'High-Concurrency In-Memory LRU Cache',
      desc: 'Build an O(1) read/write Least Recently Used cache combining Doubly Linked List and Hash Map with thread safety.',
      tags: ['Linked Lists', 'Hash Maps', 'Concurrency'],
      difficulty: 'Intermediate',
      prompt: 'Guide me step-by-step through designing an O(1) LRU Cache in Python with clean boundary conditions.'
    },
    {
      id: 'trie_autocomplete',
      title: 'Prefix Trie & Real-Time Autocomplete Engine',
      desc: 'Implement a memory-efficient prefix tree supporting top-K prefix query ranking and wildcard search.',
      tags: ['Trees', 'Strings', 'Complexity Analysis'],
      difficulty: 'Intermediate',
      prompt: 'Explain how to design an efficient Autocomplete Trie with frequency counts and wildcard lookup.'
    },
    {
      id: 'shortest_path_router',
      title: 'Dijkstra & A* Network Routing Simulator',
      desc: 'Simulate packet latency routing on directed weighted graphs with priority queue optimization.',
      tags: ['Graphs', 'Shortest Paths', 'Heuristics'],
      difficulty: 'Advanced',
      prompt: 'How does Dijkstra algorithm guarantee shortest path optimality using a min-heap priority queue?'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[calc(100dvh-2rem)] flex flex-col bg-white dark:bg-[#182A42] text-[#17243A] dark:text-[#F1F5FB] rounded-2xl shadow-2xl border border-[#E2E8F0] dark:border-[#243B5B] overflow-hidden">
        {/* Header */}
        <div className="bg-[#243B63] dark:bg-[#14233A] px-5 sm:px-6 py-5 text-white relative shrink-0 border-b border-[#E2E8F0] dark:border-[#243B5B]">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 bg-white/15 rounded-lg">
              <FolderGit2 className="w-4 h-4 text-[#38B7A5]" />
            </span>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-[#A8B7CC]">
              Hands-On Algorithmic Projects
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold font-heading">
            Applied DSA Engineering Projects
          </h3>
          <p className="text-xs text-[#A8B7CC] mt-1">
            Production-grade systems projects reinforcing algorithm invariants and memory layout.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1" data-lenis-prevent>
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="p-4 rounded-xl bg-[#F5F7FB] dark:bg-[#20344E] border border-[#E2E8F0] dark:border-[#243B5B] space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-[#17243A] dark:text-[#F1F5FB] flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-[#38B7A5]" />
                    <span>{proj.title}</span>
                  </h4>
                  <p className="text-xs text-[#64748B] dark:text-[#A8B7CC] leading-relaxed">
                    {proj.desc}
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-[#6C8FF5] border border-indigo-200 dark:border-indigo-800 shrink-0">
                  {proj.difficulty}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#E2E8F0] dark:border-[#243B5B]">
                <div className="flex flex-wrap gap-1.5">
                  {proj.tags.map((tag, tIdx) => (
                    <span
                      key={tIdx}
                      className="text-[10px] px-2 py-0.5 rounded bg-white dark:bg-[#182A42] border border-[#E2E8F0] dark:border-[#243B5B] text-[#64748B] dark:text-[#A8B7CC]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => {
                    onClose();
                    if (onOpenTutor) onOpenTutor(proj.prompt);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#38B7A5] hover:underline cursor-pointer"
                >
                  <span>Build with AI Tutor</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#F5F7FB] dark:bg-[#14233A] border-t border-[#E2E8F0] dark:border-[#243B5B] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#243B63] dark:bg-[#38B7A5] text-white dark:text-[#101B2D] text-xs font-bold rounded-xl shadow-xs hover:bg-[#1E3554] dark:hover:bg-[#2EA191] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

