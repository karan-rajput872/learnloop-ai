import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Video,
  VideoOff,
  Sparkles,
  Camera,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  X,
  Loader2,
  ShieldCheck,
  Send,
  Layers,
  Clock,
  ChevronDown,
  FlipHorizontal,
  RotateCw
} from 'lucide-react';
import { useLiveVideo } from '../hooks/useLiveVideo';
import { api } from '../services/api';
import { LiveVideoAnalysisResult } from '../types';

interface LiveVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialConceptId?: string;
  studentId?: string;
}

const DSA_CONCEPTS_LIST = [
  { id: 'binary_trees', name: 'Binary Search Trees (BST)' },
  { id: 'recursion', name: 'Recursion Trees' },
  { id: 'stacks', name: 'Stacks (LIFO Operations)' },
  { id: 'queues', name: 'Queues & Circular Queues' },
  { id: 'linked_lists', name: 'Linked Lists & Pointers' },
  { id: 'graphs', name: 'Graphs & Traversals' },
  { id: 'sorting', name: 'Sorting Invariants' },
  { id: 'searching', name: 'Binary Search Partitions' },
  { id: 'arrays', name: 'Array Memory Layout' }
];

const QUICK_PROMPTS = [
  'Check if my binary search tree satisfies ordering invariants',
  'Is my recursion base case properly positioned?',
  'Verify pointer connections for any memory leaks',
  'Does this whiteboard trace match the expected time complexity?'
];

export const LiveVideoModal: React.FC<LiveVideoModalProps> = ({
  isOpen,
  onClose,
  initialConceptId = 'binary_trees',
  studentId
}) => {
  const {
    videoRef,
    isStreaming,
    isLoading: isCameraLoading,
    permissionState,
    errorMessage,
    availableDevices,
    selectedDeviceId,
    isMirrored,
    toggleMirror,
    startVideo,
    stopVideo,
    switchCamera,
    captureFrameBase64
  } = useLiveVideo();

  const [selectedConcept, setSelectedConcept] = useState<string>(initialConceptId);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<LiveVideoAnalysisResult | null>(null);
  const [autoAnalyze, setAutoAnalyze] = useState<boolean>(false);
  const [autoTimerCountdown, setAutoTimerCountdown] = useState<number>(10);
  const [capturedSnapshot, setCapturedSnapshot] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const autoAnalyzeTimerRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);

  // Sync initial concept when prop changes
  useEffect(() => {
    if (initialConceptId) {
      setSelectedConcept(initialConceptId);
    }
  }, [initialConceptId]);

  // Clean stop on modal close or unmount
  useEffect(() => {
    if (!isOpen) {
      stopVideo();
      setAutoAnalyze(false);
      setAnalysisResult(null);
      setCapturedSnapshot(null);
      setAnalysisError(null);
      if (autoAnalyzeTimerRef.current) clearInterval(autoAnalyzeTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    }
  }, [isOpen, stopVideo]);

  // Keyboard escape listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopVideo();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, stopVideo]);

  // Execute frame analysis with multimodal AI
  const handleAnalyzeFrame = useCallback(async () => {
    console.log('[LiveVideoModal] handleAnalyzeFrame called, isAnalyzing:', isAnalyzing, 'isStreaming:', isStreaming);
    if (isAnalyzing || !isStreaming) return;

    const frameBase64 = captureFrameBase64();
    console.log('[LiveVideoModal] captureFrameBase64 length:', frameBase64 ? frameBase64.length : 0);
    if (!frameBase64) {
      setAnalysisError('Could not capture frame from video feed. Please ensure camera is active and well-lit.');
      return;
    }

    setCapturedSnapshot(frameBase64);
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const result = await api.analyzeVideoFrame(
        frameBase64,
        selectedConcept,
        customPrompt || undefined,
        studentId
      );
      setAnalysisResult(result);
    } catch (err: any) {
      setAnalysisError(err.message || 'Visual problem analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [captureFrameBase64, customPrompt, isAnalyzing, isStreaming, selectedConcept, studentId]);

  // Handle auto-analyze loop
  useEffect(() => {
    if (!autoAnalyze || !isStreaming) {
      if (autoAnalyzeTimerRef.current) clearInterval(autoAnalyzeTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      return;
    }

    setAutoTimerCountdown(10);

    countdownIntervalRef.current = setInterval(() => {
      setAutoTimerCountdown((prev) => (prev <= 1 ? 10 : prev - 1));
    }, 1000);

    autoAnalyzeTimerRef.current = setInterval(() => {
      handleAnalyzeFrame();
    }, 10000);

    return () => {
      if (autoAnalyzeTimerRef.current) clearInterval(autoAnalyzeTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [autoAnalyze, isStreaming, handleAnalyzeFrame]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="live-video-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in"
    >
      <div
        className="relative w-full max-w-5xl rounded-3xl bg-white border border-[#E6E9EF] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================= */}
        {/* HEADER BAR                                                */}
        {/* ========================================================= */}
        <div className="px-6 py-4 border-b border-[#E6E9EF] bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#5B5CE2] to-indigo-600 flex items-center justify-center text-white shadow-md shadow-[#5B5CE2]/25">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="live-video-title" className="text-base font-bold text-[#172033] font-sans">
                  Explore Live Video
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-mono font-bold uppercase tracking-wider">
                  Gemini 2.5 Flash Vision
                </span>
              </div>
              <p className="text-xs text-[#667085]">
                Real-time visual Socratic tutoring for whiteboard diagrams, recursion trees & handwritten code
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isStreaming && (
              <button
                type="button"
                onClick={() => {
                  stopVideo();
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                <VideoOff className="w-3.5 h-3.5 text-rose-600" />
                <span>End Video Session</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                stopVideo();
                onClose();
              }}
              aria-label="Close Live Video"
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* MAIN BODY                                                 */}
        {/* ========================================================= */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-sm font-sans">
          {/* ------------------------------------------------------- */}
          {/* STATE A: INITIAL / NOT STREAMING                        */}
          {/* ------------------------------------------------------- */}
          {!isStreaming ? (
            <div className="max-w-xl mx-auto py-8 space-y-6 text-center animate-fade-in">
              <div className="w-20 h-20 rounded-3xl bg-[#EEF0FD] border border-[#C7D2FE] flex items-center justify-center mx-auto text-[#5B5CE2] shadow-inner">
                <Video className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-bold text-[#172033]">
                  Visual Socratic Problem Solver
                </h3>
                <p className="text-xs sm:text-sm text-[#667085] leading-relaxed max-w-md mx-auto">
                  Hold up your handwritten notes, draw diagrams on a whiteboard, or point your webcam at code.
                  Gemini 2.5 Flash analyzes your visual work in real time, catches invariant violations, and guides you to the solution.
                </p>
              </div>

              {/* Camera Permission / Error Warning if applicable */}
              {errorMessage && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left text-xs text-amber-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Camera Permission or Device Issue</span>
                  </div>
                  <p className="leading-relaxed">{errorMessage}</p>
                  <p className="text-[11px] text-amber-700 font-mono">
                    Tip: If you have OBS Virtual Camera, try selecting your physical camera (e.g. HP 5MP Camera) or allow browser permissions.
                  </p>
                </div>
              )}

              {/* Start Camera CTA */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => startVideo()}
                  disabled={isCameraLoading}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-2xl bg-[#5B5CE2] hover:bg-[#494AC8] text-white font-bold text-sm shadow-lg shadow-[#5B5CE2]/25 transition-all transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-60"
                >
                  {isCameraLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Video className="w-4 h-4" />
                  )}
                  <span>{isCameraLoading ? 'Connecting Camera...' : 'Start Live Video'}</span>
                </button>
              </div>

              {/* Privacy Guarantee Disclosure */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-[#E6E9EF] text-left text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-[#5B5CE2]" />
                  <span>Privacy & Student Safety Guarantee</span>
                </div>
                <p className="text-[#667085] leading-relaxed text-[11px]">
                  • <strong>Local Processing:</strong> Camera preview runs entirely locally in your browser sandbox.
                  <br />
                  • <strong>Zero Long-Term Storage:</strong> Video is never recorded or stored to cloud buckets.
                  <br />
                  • <strong>User-Initiated Frames:</strong> Single frames are only sent to Gemini 2.5 Flash when you explicitly click &quot;Analyze&quot; or enable auto-analyze.
                </p>
              </div>
            </div>
          ) : (
            /* ------------------------------------------------------- */
            /* STATE B: ACTIVE VIDEO STREAM + MULTIMODAL AI FEEDBACK   */
            /* ------------------------------------------------------- */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
              {/* Left Column: Video Viewport & Controls (7 Cols) */}
              <div className="lg:col-span-7 space-y-4">
                {/* Video Container */}
                <div className="relative rounded-2xl bg-black border border-slate-800 overflow-hidden shadow-xl aspect-video flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover transition-transform ${isMirrored ? 'scale-x-[-1]' : ''}`}
                  />

                  {/* Scanning Animation Bar when Analyzing */}
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-indigo-500/10 pointer-events-none flex flex-col justify-between overflow-hidden">
                      <div className="w-full h-1 bg-gradient-to-r from-transparent via-[#5B5CE2] to-transparent animate-pulse" />
                      <div className="w-full text-center py-2 bg-slate-900/70 backdrop-blur-sm text-white font-mono text-xs flex items-center justify-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#5B5CE2]" />
                        <span>Gemini 2.5 Flash is inspecting visual invariants...</span>
                      </div>
                      <div className="w-full h-1 bg-gradient-to-r from-transparent via-[#5B5CE2] to-transparent animate-pulse" />
                    </div>
                  )}

                  {/* Top Left Live Status Pill */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white font-mono text-[10px] font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      LIVE CAMERA
                    </span>
                    {autoAnalyze && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-900/80 backdrop-blur-md border border-indigo-400 text-indigo-200 font-mono text-[10px]">
                        <Clock className="w-3 h-3 animate-spin" />
                        Next scan: {autoTimerCountdown}s
                      </span>
                    )}
                  </div>

                  {/* Top Right Quick Controls: Mirror & Reconnect */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={toggleMirror}
                      className={`p-1.5 rounded-lg backdrop-blur-md border text-xs transition-colors cursor-pointer ${isMirrored
                          ? 'bg-indigo-600/80 border-indigo-400 text-white'
                          : 'bg-black/60 border-white/20 text-white/80 hover:text-white'
                        }`}
                      title={isMirrored ? 'Disable Mirror View (natural reading)' : 'Enable Mirror View'}
                    >
                      <FlipHorizontal className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => startVideo(selectedDeviceId)}
                      disabled={isCameraLoading}
                      className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white/80 hover:text-white text-xs transition-colors cursor-pointer"
                      title="Reconnect / Refresh Video Feed"
                    >
                      <RotateCw className={`w-4 h-4 ${isCameraLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {/* Bottom Left Camera Selector (Instant Switching) */}
                  {availableDevices.length > 0 && (
                    <div className="absolute bottom-3 left-3 max-w-[80%]">
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-white/20 text-white text-[11px] font-mono">
                        <Camera className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                        <select
                          value={selectedDeviceId}
                          onChange={(e) => switchCamera(e.target.value)}
                          className="bg-transparent text-white text-[11px] font-mono focus:outline-none cursor-pointer truncate"
                          title="Switch camera device"
                        >
                          {availableDevices.map((d, i) => (
                            <option key={d.deviceId || i} value={d.deviceId} className="bg-slate-900 text-white">
                              {d.label || `Camera ${i + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Concept Selector & Capture Trigger */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-[#E6E9EF] space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#5B5CE2]" />
                      <label htmlFor="concept-select" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Topic Focus:
                      </label>
                      <select
                        id="concept-select"
                        value={selectedConcept}
                        onChange={(e) => setSelectedConcept(e.target.value)}
                        className="px-3 py-1.5 rounded-xl border border-[#E6E9EF] bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5B5CE2]/20"
                      >
                        {DSA_CONCEPTS_LIST.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Auto-Analyze Hands-Free Toggle */}
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={autoAnalyze}
                        onChange={(e) => setAutoAnalyze(e.target.checked)}
                        className="w-4 h-4 rounded text-[#5B5CE2] focus:ring-[#5B5CE2]"
                      />
                      <span>Auto-Analyze (Every 10s)</span>
                    </label>
                  </div>

                  {/* Custom Student Inquiry */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Optional question (e.g. Is node 15 valid on the left of 30?)"
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAnalyzeFrame()}
                      className="w-full px-3.5 py-2 pr-28 rounded-xl border border-[#E6E9EF] bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5B5CE2]/20"
                    />
                    <button
                      type="button"
                      data-testid="analyze-frame-button"
                      onClick={handleAnalyzeFrame}
                      disabled={isAnalyzing}
                      className="absolute right-1 top-1 bottom-1 px-3 rounded-lg bg-[#5B5CE2] hover:bg-[#494AC8] text-white text-xs font-bold flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isAnalyzing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      )}
                      <span>Analyze</span>
                    </button>
                  </div>

                  {/* Quick Inquiry Pills */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {QUICK_PROMPTS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCustomPrompt(p)}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-[#E6E9EF] text-slate-600 hover:text-[#5B5CE2] hover:border-indigo-200 transition-colors cursor-pointer"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: AI Analysis Output & Socratic Feedback (5 Cols) */}
              <div className="lg:col-span-5 space-y-4 flex flex-col">
                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex-1 flex flex-col space-y-3">
                  <div className="flex items-center justify-between border-b border-indigo-100/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#5B5CE2]" />
                      <span className="font-bold text-xs text-indigo-950 font-sans">
                        AI Visual Inspection Feedback
                      </span>
                    </div>
                    {analysisResult && (
                      <span className="px-2 py-0.5 rounded-full bg-white border border-indigo-200 text-indigo-700 font-mono text-[10px] font-bold">
                        {analysisResult.is_ai_powered ? 'Gemini 2.5 Flash' : 'Deterministic Rule'}
                      </span>
                    )}
                  </div>

                  {analysisError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{analysisError}</span>
                    </div>
                  )}

                  {/* Empty State before first analysis */}
                  {!analysisResult && !isAnalyzing && !analysisError && (
                    <div className="py-12 flex-1 flex flex-col items-center justify-center text-center text-slate-400 space-y-3">
                      <Camera className="w-8 h-8 text-indigo-300 animate-pulse" />
                      <p className="text-xs max-w-xs text-slate-600">
                        Position your diagram or code in the video frame, then click{' '}
                        <strong>&quot;Analyze&quot;</strong> to receive instant Socratic guidance.
                      </p>
                    </div>
                  )}

                  {/* Loading State during analysis */}
                  {isAnalyzing && (
                    <div className="py-12 flex-1 flex flex-col items-center justify-center text-center space-y-3">
                      <Loader2 className="w-8 h-8 text-[#5B5CE2] animate-spin" />
                      <p className="text-xs font-semibold text-indigo-900">
                        Evaluating visual invariants...
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        Checking tree constraints, pointer boundaries & asymptotic steps
                      </p>
                    </div>
                  )}

                  {/* Result Card */}
                  {analysisResult && !isAnalyzing && (
                    <div className="space-y-3 flex-1 flex flex-col animate-fade-in">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-indigo-900">
                          {analysisResult.concept_name}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[10px]">
                          Confidence: {Math.round(analysisResult.confidence * 100)}%
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-white border border-indigo-100/90 text-xs text-slate-800 leading-relaxed font-sans flex-1 overflow-y-auto whitespace-pre-line shadow-xs">
                        {analysisResult.analysis}
                      </div>

                      {/* Snapshot preview thumbnail */}
                      {capturedSnapshot && (
                        <div className="flex items-center gap-2.5 pt-1">
                          <img
                            src={capturedSnapshot}
                            alt="Analyzed Frame"
                            className="w-16 h-10 object-cover rounded-lg border border-slate-300 shadow-xs shrink-0"
                          />
                          <span className="text-[10px] text-slate-500 font-mono">
                            Frame captured at {new Date(analysisResult.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* FOOTER BAR                                                */}
        {/* ========================================================= */}
        <div className="px-6 py-3 border-t border-[#E6E9EF] bg-slate-50/70 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#5B5CE2]" />
            <span>Zero-Retention Policy • Frames Analyzed In-Memory</span>
          </div>

          <button
            type="button"
            onClick={() => {
              stopVideo();
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl border border-[#E6E9EF] bg-white text-slate-700 hover:bg-slate-50 font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
