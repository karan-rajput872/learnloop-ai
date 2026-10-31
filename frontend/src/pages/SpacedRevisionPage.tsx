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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950 border border-purple-800 text-purple-300 text-xs font-mono mb-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Adaptive Spaced Repetition (Modified SM-2)
          </div>
          <h2 className="text-2xl font-bold font-mono text-white tracking-tight">
            Revision Calendar & Retention Tasks
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Intervals dynamically calculate memory decay based on correctness, confidence, and detected misconceptions.
          </p>
        </div>

        <button
          onClick={fetchTasks}
          disabled={loading}
          className="self-start sm:self-auto p-2.5 rounded-xl bg-edu-900 hover:bg-edu-800 border border-edu-700 text-slate-300 transition-colors"
          title="Refresh Schedule"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between bg-edu-900 rounded-xl border border-edu-800 p-1.5 text-xs font-mono">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFilter('pending')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              filter === 'pending'
                ? 'bg-purple-950 text-purple-300 border border-purple-800 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Pending Reviews ({tasks.filter(t => t.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              filter === 'completed'
                ? 'bg-purple-950 text-purple-300 border border-purple-800 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Completed ({tasks.filter(t => t.status === 'completed').length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-purple-950 text-purple-300 border border-purple-800 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Tasks ({tasks.length})
          </button>
        </div>

        <span className="text-[11px] text-slate-500 pr-2 hidden sm:inline">
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
                  ? 'bg-edu-950/60 border-edu-800/60 opacity-60'
                  : 'bg-edu-900/90 border-edu-700/80 shadow-md'
              }`}
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                    task.urgency === 'high' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                    task.urgency === 'medium' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                    'bg-edu-950 text-slate-300 border border-edu-800'
                  }`}>
                    Urgency: {task.urgency}
                  </span>
                  <span className="text-xs font-mono font-bold text-white">
                    {task.concept_name}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Due Date: <strong className="text-loop-blue">{task.due_date}</strong>
                  </span>
                </div>

                <p className="text-xs text-slate-300 font-sans">
                  {task.reason}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onPracticeConcept(task.concept_id)}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold transition-all shadow-md shadow-purple-500/20 flex items-center gap-1.5"
                >
                  Practice Now
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                {task.status !== 'completed' && (
                  <button
                    onClick={() => handleComplete(task.id)}
                    className="p-2 rounded-xl bg-edu-950 hover:bg-emerald-950 hover:text-emerald-300 border border-edu-800 text-slate-400 transition-colors"
                    title="Mark Completed"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-edu-900 rounded-2xl border border-edu-800 p-12 text-center text-slate-400 font-mono text-xs space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <div>No revision tasks match this filter. Complete adaptive quizzes to schedule new spaced reviews!</div>
          </div>
        )}
      </div>

    </div>
  );
};
