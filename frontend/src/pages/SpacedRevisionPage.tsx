import React, { useState, useEffect } from 'react';
import { RevisionTask } from '../types';
import { api } from '../services/api';
import { Calendar, CheckCircle2, AlertCircle, Clock, ArrowRight, RefreshCw, Sparkles } from 'lucide-react';

interface SpacedRevisionPageProps {
  onPracticeConcept: (conceptId: string) => void;
}

export const SpacedRevisionPage: React.FC<SpacedRevisionPageProps> = ({ onPracticeConcept }) => {
  const [tasks, setTasks] = useState<RevisionTask[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await api.getRevisionTasks();
      setTasks(data.tasks);
    } catch (err) {
      console.error('Failed to load revision tasks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleComplete = async (taskId: string) => {
    try {
      await api.completeRevisionTask(taskId);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed' } : t));
    } catch (err) {
      console.error('Failed to mark task completed', err);
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === 'pending') return t.status === 'pending';
    if (filter === 'completed') return t.status === 'completed';
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF0FD] border border-[#C7D2FE] text-[#5B5CE2] text-xs font-mono font-medium mb-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Adaptive Spaced Repetition (Modified SM-2)
          </div>
          <h2 className="text-2xl font-bold font-sans text-[#172033] tracking-tight">
            Revision Calendar & Retention Tasks
          </h2>
          <p className="text-xs sm:text-sm text-[#667085] mt-0.5 font-sans">
            Intervals dynamically calculate memory decay based on correctness, confidence, and detected misconceptions.
          </p>
        </div>

        <button
          onClick={fetchTasks}
          disabled={loading}
          className="self-start sm:self-auto p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-[#E6E9EF] text-[#667085] transition-colors shadow-xs"
          title="Refresh Schedule"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#5B5CE2]' : ''}`} />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-[#E6E9EF] p-1.5 text-xs font-mono shadow-card">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFilter('pending')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              filter === 'pending'
                ? 'bg-[#EEF0FD] text-[#5B5CE2] border border-[#C7D2FE] font-bold'
                : 'text-[#667085] hover:text-[#172033]'
            }`}
          >
            Pending Reviews ({tasks.filter(t => t.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              filter === 'completed'
                ? 'bg-[#EEF0FD] text-[#5B5CE2] border border-[#C7D2FE] font-bold'
                : 'text-[#667085] hover:text-[#172033]'
            }`}
          >
            Completed ({tasks.filter(t => t.status === 'completed').length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-[#EEF0FD] text-[#5B5CE2] border border-[#C7D2FE] font-bold'
                : 'text-[#667085] hover:text-[#172033]'
            }`}
          >
            All Tasks ({tasks.length})
          </button>
        </div>

        <span className="text-[11px] text-[#667085] pr-2 hidden sm:inline font-mono">
          Dynamic Retention Engine
        </span>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                task.status === 'completed'
                  ? 'bg-slate-50 border-slate-200 opacity-60'
                  : 'bg-white border-[#E6E9EF] shadow-card'
              }`}
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                    task.urgency === 'high' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                    task.urgency === 'medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    Urgency: {task.urgency}
                  </span>
                  <span className="text-xs font-bold text-[#172033] font-sans">
                    {task.concept_name}
                  </span>
                  <span className="text-[11px] font-mono text-[#667085] flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    Due Date: <strong className="text-[#5B5CE2]">{task.due_date}</strong>
                  </span>
                </div>

                <p className="text-xs text-[#667085] font-sans">
                  {task.reason}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onPracticeConcept(task.concept_id)}
                  className="px-3.5 py-2 rounded-xl bg-[#5B5CE2] hover:bg-[#494AC8] text-white font-medium text-xs transition-all shadow-xs flex items-center gap-1.5"
                >
                  Practice Now
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                {task.status !== 'completed' && (
                  <button
                    onClick={() => handleComplete(task.id)}
                    className="p-2 rounded-xl bg-slate-50 hover:bg-teal-50 hover:text-teal-700 border border-[#E6E9EF] text-[#667085] transition-colors"
                    title="Mark Completed"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-2xl border border-[#E6E9EF] p-12 text-center text-[#667085] font-sans text-xs space-y-2 shadow-card">
            <CheckCircle2 className="w-8 h-8 text-teal-600 mx-auto" />
            <div>No revision tasks match this filter. Complete adaptive quizzes to schedule new spaced reviews!</div>
          </div>
        )}
      </div>

    </div>
  );
};
