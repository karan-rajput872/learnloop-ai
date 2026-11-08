import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Video,
  VideoOff,
  Sparkles,
  Camera,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  X,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Send,
  Layers,
  Clock,
  ChevronDown,
  FlipHorizontal,
  RotateCw,
  Binary,
  ArrowRight,
  Eye
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

const CONCEPT_INVARIANTS_MAP: Record<string, string[]> = {
  binary_trees: [
    'All keys in left subtree < Root.key',
    'All keys in right subtree > Root.key',
    'No duplicate keys in strict BST invariant',
    'Null leaf boundary termination'
  ],
  recursion: [
    'Base case halts execution without recursion',
    'Recursive step strictly reduces problem size',
    'No circular parameter progression',
    'Return values accumulate correctly'
  ],
  stacks: [
    'Last-In-First-Out (LIFO) protocol preserved',
    'Top pointer correctly bounds array capacity',
    'Underflow check before pop()',
    'Overflow check before push()'
  ],
  queues: [
    'First-In-First-Out (FIFO) ordering preserved',
    'Circular modulo wraparound: (rear + 1) % N',
    'Front pointer accurately tracks oldest item',
    'Empty vs full state disambiguation'
  ],
  linked_lists: [
    'New node pointer connected before overwriting predecessor',
    'Sentinel / dummy head guards edge insertions',
    'Fast and slow pointers detect cycles',
    'Tail node terminates with explicit null'
  ],
  graphs: [
    'Visited tracking set prevents infinite cycles',
    'BFS explores via FIFO queue layer-by-layer',
    'DFS unwinds via stack / call frame',
    'Adjacency list captures directed relations'
  ],
  searching: [
    'Input sequence satisfies sorted precondition',
    'Interval [left..right] invariant maintained',
    'Safe mid: left + (right - left) // 2',
    'Strict termination on left > right'
  ],
  sorting: [
    'Partition element isolates elements <= pivot',
    'Equal keys preserve relative order (stability)',
    'Subarray boundary pointers do not cross unsafely',
    'In-place swaps do not overwrite elements'
  ],
  arrays: [
    '0-indexed contiguous memory arithmetic',
    'Index stays strictly within 0 <= i < length',
    'Dynamic geometric resizing amortizes copies',
    'Two-pointer bounds check at array extremes'
  ]
};

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

  // Sync initial concept
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        stopVideo();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, stopVideo]);

  // Determine the exact camera state for Phase 8
  const getCameraState = (): 'active' | 'requesting' | 'denied' | 'unavailable' | 'disconnected' | 'not_enabled' => {
    if (isStreaming) return 'active';
    if (isCameraLoading) return 'requesting';
    if (permissionState === 'denied') return 'denied';
    if (permissionState === 'not-found') return 'unavailable';
    if (errorMessage && errorMessage.includes('disconnected')) return 'disconnected';
    return 'not_enabled';
  };

  const cameraState = getCameraState();

  // Execute frame analysis with multimodal AI
  const handleAnalyzeFrame = useCallback(async () => {
    if (isAnalyzing || !isStreaming) return;

    const frameBase64 = captureFrameBase64();
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

  // Auto-analyze loop
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

  const conceptInvariants = CONCEPT_INVARIANTS_MAP[selectedConcept] || CONCEPT_INVARIANTS_MAP['binary_trees'];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="live-video-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in"
    >
      <div
        className="relative w-full max-w-5xl rounded-2xl sm:rounded-3xl bg-white border border-[#E6E9EF] shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-1rem)]"
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
                  Explore Live Video Studio
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
                <span>End Session</span>
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
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-sm font-sans" data-lenis-prevent>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
            
            {/* Left Column: Video Viewport & Camera States (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Video Viewport Container with 6 Specific States */}
              <div className="relative rounded-2xl bg-[#0F172A] border border-slate-800 overflow-hidden shadow-xl aspect-video flex items-center justify-center">
                
                {/* 1. STATE: CAMERA ACTIVE */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transition-transform ${
                    isStreaming ? 'block' : 'hidden'
                  } ${isMirrored ? 'scale-x-[-1]' : ''}`}
                />

                {/* 2. STATE: CAMERA NOT YET ENABLED */}
                {cameraState === 'not_enabled' && (
                  <div className="p-6 text-center space-y-3.5 max-w-sm animate-fade-in text-white">
                    <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-indigo-400">
                      <Camera className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-slate-200">Camera Feed Not Yet Enabled</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Start video to stream your whiteboard, notes, or code to Gemini 2.5 Flash for instant Socratic feedback.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startVideo()}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#5B5CE2] hover:bg-[#494AC8] text-white text-xs font-bold transition-all shadow-md shadow-[#5B5CE2]/25 cursor-pointer"
                    >
                      <Video className="w-4 h-4" />
                      <span>Enable Camera Feed</span>
                    </button>
                  </div>
                )}

                {/* 3. STATE: PERMISSION REQUESTED */}
                {cameraState === 'requesting' && (
                  <div className="p-6 text-center space-y-3 max-w-sm animate-fade-in text-white">
                    <Loader2 className="w-10 h-10 animate-spin text-[#5B5CE2] mx-auto" />
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-slate-200">Permission Requested</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Please check your browser address bar and select <strong>&quot;Allow&quot;</strong> to grant camera access.
                      </p>
                    </div>
                  </div>
                )}

                {/* 4. STATE: PERMISSION DENIED */}
                {cameraState === 'denied' && (
                  <div className="p-6 text-center space-y-3 max-w-sm animate-fade-in text-white">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-rose-200">Camera Access Blocked</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Camera permission was declined in your browser. Click the lock/site settings icon in your URL bar, change Camera to &quot;Allow&quot;, and retry.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startVideo()}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 font-semibold cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry Connection</span>
                    </button>
                  </div>
                )}

                {/* 5. STATE: CAMERA UNAVAILABLE */}
                {cameraState === 'unavailable' && (
                  <div className="p-6 text-center space-y-3 max-w-sm animate-fade-in text-white">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-amber-200">No Camera Detected</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        No video capture hardware was found. Connect a USB camera or virtual driver to enable visual tutoring.
                      </p>
                    </div>
                  </div>
                )}

                {/* 6. STATE: CAMERA DISCONNECTED */}
                {cameraState === 'disconnected' && (
                  <div className="p-6 text-center space-y-3 max-w-sm animate-fade-in text-white">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                      <VideoOff className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-slate-200">Camera Disconnected</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        The video track was ended by hardware or another program. Click to reconnect.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startVideo()}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#5B5CE2] hover:bg-[#494AC8] text-xs text-white font-bold cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Reconnect Camera</span>
                    </button>
                  </div>
                )}

                {/* Scanning Animation Bar when Analyzing */}
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-indigo-500/10 pointer-events-none flex flex-col justify-between overflow-hidden">
                    <div className="w-full h-1 bg-gradient-to-r from-transparent via-[#5B5CE2] to-transparent animate-pulse" />
                    <div className="w-full text-center py-2 bg-slate-900/80 backdrop-blur-sm text-white font-mono text-xs flex items-center justify-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#5B5CE2]" />
                      <span>Gemini 2.5 Flash is inspecting visual invariants...</span>
                    </div>
                    <div className="w-full h-1 bg-gradient-to-r from-transparent via-[#5B5CE2] to-transparent animate-pulse" />
                  </div>
                )}

                {/* Top Left Live Status Pill */}
                {isStreaming && (
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white font-mono text-[10px] font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      LIVE CAMERA
                    </span>
                    {autoAnalyze && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-900/80 backdrop-blur-md border border-indigo-400 text-indigo-200 font-mono text-[10px]">
                        <Clock className="w-3 h-3 animate-spin" />
                        Scan in: {autoTimerCountdown}s
                      </span>
                    )}
                  </div>
                )}

                {/* Top Right Quick Controls */}
                {isStreaming && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={toggleMirror}
                      className={`p-1.5 rounded-lg backdrop-blur-md border text-xs transition-colors cursor-pointer ${
                        isMirrored
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
                )}

                {/* Bottom Left Device Selector */}
                {isStreaming && availableDevices.length > 0 && (
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

              {/* Topic Selector & Capture Trigger Bar */}
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
                      className="px-3 py-1.5 rounded-xl border border-[#E6E9EF] bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5B5CE2]/20 cursor-pointer"
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
                      disabled={!isStreaming}
                      className="w-4 h-4 rounded text-[#5B5CE2] focus:ring-[#5B5CE2] disabled:opacity-50"
                    />
                    <span>Auto-Analyze (Every 10s)</span>
                  </label>
                </div>

                {/* Custom Student Inquiry */}
                <div className="relative">
                  <input
                    type="text"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Ask specific question (e.g., 'Is my BST right subtree valid?')..."
                    className="w-full pl-3 pr-24 py-2.5 rounded-xl border border-[#E6E9EF] text-xs font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5B5CE2]/20"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAnalyzeFrame();
                    }}
                  />
                  <button
                    type="button"
                    data-testid="analyze-frame-button"
                    onClick={handleAnalyzeFrame}
                    disabled={isAnalyzing || !isStreaming}
                    className="absolute right-1 top-1 bottom-1 px-4 rounded-lg bg-[#5B5CE2] hover:bg-[#494AC8] text-white text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
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
                      className="min-h-[28px] text-[11px] px-2.5 py-1 rounded-lg bg-white border border-[#E6E9EF] text-slate-600 hover:text-[#5B5CE2] hover:border-indigo-200 transition-colors cursor-pointer"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="px-3 text-[11px] text-slate-500 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#38B7A5] shrink-0" />
                <span>Zero recordings stored. Camera preview runs in client sandbox; frames sent only when analyzed.</span>
              </div>
            </div>

            {/* Right Column: AI Analysis Output & Socratic Invariant Guidance (5 Cols) */}
            <div className="lg:col-span-5 space-y-4 flex flex-col">
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex-1 flex flex-col space-y-3">
                <div className="flex items-center justify-between border-b border-indigo-100/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#5B5CE2]" />
                    <span className="font-bold text-xs text-indigo-950 font-sans">
                      AI Socratic Feedback
                    </span>
                  </div>
                  {analysisResult && (
                    <span className="px-2 py-0.5 rounded-full bg-white border border-indigo-200 text-indigo-700 font-mono text-[10px] font-bold">
                      {analysisResult.is_ai_powered ? 'Gemini 2.5 Flash' : 'Deterministic Tutor'}
                    </span>
                  )}
                </div>

                {analysisError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{analysisError}</span>
                  </div>
                )}

                {/* STATE 1: IDLE / STANDBY GUIDE BEFORE FIRST ANALYSIS */}
                {!analysisResult && !isAnalyzing && !analysisError && (
                  <div className="space-y-4 flex-1 flex flex-col justify-between py-2">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                        <Eye className="w-4 h-4 text-[#5B5CE2]" />
                        <span>Multimodal Inspector Active</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Position your diagram, whiteboard notes, or code in the camera frame, then click <strong>&quot;Analyze&quot;</strong>.
                      </p>
                    </div>

                    {/* Live Invariant Checklist for Selected Topic */}
                    <div className="p-3.5 rounded-xl bg-white/80 border border-indigo-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#5B5CE2]">
                          Invariants Monitored
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {selectedConcept.replace('_', ' ')}
                        </span>
                      </div>
                      <ul className="space-y-1.5 text-[11px] text-slate-700">
                        {conceptInvariants.map((inv, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
                            <span>{inv}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3 rounded-xl bg-indigo-100/50 text-[11px] text-indigo-900 leading-relaxed">
                      💡 <strong>Tip:</strong> Ensure good lighting and hold the page steady so node labels and pointer arrows are legible.
                    </div>
                  </div>
                )}

                {/* STATE 2: LOADING DURING ANALYSIS */}
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

                {/* STATE 3: RESULT PRESENTED */}
                {analysisResult && !isAnalyzing && (
                  <div className="space-y-3.5 flex-1 flex flex-col animate-fade-in">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-indigo-900">
                        {analysisResult.concept_name}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[10px] font-bold">
                        Confidence: {Math.round(analysisResult.confidence * 100)}%
                      </span>
                    </div>

                    {/* Socratic Feedback */}
                    <div className="p-3.5 rounded-xl bg-white border border-indigo-100 space-y-1.5">
                      <div className="font-bold text-xs text-indigo-950 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#5B5CE2]" />
                        <span>Socratic Observation</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {analysisResult.feedback}
                      </p>
                    </div>

                    {/* Invariants Checked Checklist */}
                    {analysisResult.invariants_checked && analysisResult.invariants_checked.length > 0 && (
                      <div className="p-3 rounded-xl bg-white/70 border border-indigo-100 space-y-1.5">
                        <span className="font-bold text-[11px] text-slate-800 uppercase tracking-wider block">
                          Invariants Verified:
                        </span>
                        <div className="space-y-1">
                          {analysisResult.invariants_checked.map((inv, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-slate-700">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{inv}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Socratic Clarifying Question */}
                    {analysisResult.suggested_question && (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                        <div className="font-bold flex items-center gap-1 text-amber-800">
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Reflection Question</span>
                        </div>
                        <p className="text-xs text-amber-950 font-medium">
                          {analysisResult.suggested_question}
                        </p>
                      </div>
                    )}

                    {/* Next Action Suggestion */}
                    {analysisResult.next_step && (
                      <div className="p-2.5 rounded-lg bg-indigo-100/50 text-[11px] text-indigo-900 flex items-center gap-2">
                        <ArrowRight className="w-3.5 h-3.5 text-[#5B5CE2] shrink-0" />
                        <span><strong>Next Step:</strong> {analysisResult.next_step}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
