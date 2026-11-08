import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Award,
  Calendar,
  Sparkles,
  Check,
  Loader2
} from 'lucide-react';
import { UserNotification } from '../types';
import { api } from '../services/api';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId?: string;
  onNotificationsUpdated?: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  studentId,
  onNotificationsUpdated
}) => {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMarking, setIsMarking] = useState<boolean>(false);

  const fetchNotifications = () => {
    setIsLoading(true);
    api.getUserNotifications(studentId)
      .then((data) => {
        if (Array.isArray(data)) {
          setNotifications(data);
        } else {
          setNotifications([]);
        }
      })
      .catch((err) => {
        console.warn('Failed to load notifications:', err);
        setNotifications([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // Keyboard navigation (Escape to close)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch notifications on modal open
  useEffect(() => {
    if (!isOpen) return;
    fetchNotifications();
  }, [isOpen, studentId]);

  const handleMarkAllRead = async () => {
    setIsMarking(true);
    try {
      await api.markNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      if (onNotificationsUpdated) onNotificationsUpdated();
    } catch (err) {
      console.warn('Failed to mark all notifications read:', err);
    } finally {
      setIsMarking(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'streak':
        return <Sparkles className="w-4 h-4 text-amber-500" />;
      case 'achievement':
        return <Award className="w-4 h-4 text-indigo-500" />;
      case 'revision':
        return <Calendar className="w-4 h-4 text-[#5B5CE2]" />;
      case 'alert':
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-teal-500" />;
    }
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-[#E6E9EF] flex flex-col max-h-[calc(100dvh-1.5rem)] overflow-hidden">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#E6E9EF] flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EEF0FD] flex items-center justify-center text-[#5B5CE2] shadow-xs shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#172033] font-sans">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-mono text-[10px] font-bold">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p className="text-xs text-[#667085]">Study updates, revision reminders, and streak milestones</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close notifications"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1 text-sm font-sans" data-lenis-prevent>
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#5B5CE2]" />
              <p className="text-xs">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Bell className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-medium text-slate-600">All caught up!</p>
              <p className="text-[11px] text-slate-400">No active notifications or alerts.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3.5 rounded-2xl border transition-all ${n.is_read
                    ? 'bg-white border-[#E6E9EF] text-slate-600'
                    : 'bg-[#FAFBFD] border-[#C7D2FE] text-[#172033] shadow-xs ring-1 ring-[#5B5CE2]/10'
                  }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 shrink-0">
                    {getIcon(n.notification_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-800 truncate">{n.title}</h4>
                      <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                        {n.created_at ? new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recent'}
                      </span>
                    </div>
                    <p className="text-xs text-[#667085] mt-0.5 leading-relaxed">{n.message}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-[#E6E9EF] bg-slate-50/70 flex items-center justify-between shrink-0">
          <button
            type="button"
            disabled={unreadCount === 0 || isMarking}
            onClick={handleMarkAllRead}
            className="min-h-[44px] flex items-center gap-1.5 text-xs text-[#5B5CE2] hover:text-[#494AC8] font-semibold disabled:opacity-40 transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Mark all as read</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-[#E6E9EF] bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
