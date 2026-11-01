import { useState, useRef, useEffect, useCallback } from 'react';
import { CameraPermissionState } from '../types';

export interface UseLiveVideoReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isStreaming: boolean;
  isLoading: boolean;
  permissionState: CameraPermissionState;
  errorMessage: string | null;
  availableDevices: MediaDeviceInfo[];
  selectedDeviceId: string;
  setSelectedDeviceId: (deviceId: string) => void;
  isMirrored: boolean;
  toggleMirror: () => void;
  startVideo: (targetDeviceId?: string) => Promise<boolean>;
  stopVideo: () => void;
  switchCamera: (deviceId: string) => Promise<boolean>;
  captureFrameBase64: () => string | null;
}

/**
 * Filter out known virtual / dummy camera drivers when selecting a default webcam.
 */
function isPhysicalWebcam(device: MediaDeviceInfo): boolean {
  const label = (device.label || '').toLowerCase();
  return !label.includes('obs') && !label.includes('virtual') && !label.includes('splitcam') && !label.includes('screen');
}

export function useLiveVideo(): UseLiveVideoReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [permissionState, setPermissionState] = useState<CameraPermissionState>('prompt');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isMirrored, setIsMirrored] = useState<boolean>(false);

  const toggleMirror = useCallback(() => {
    setIsMirrored((prev) => !prev);
  }, []);

  // Enumerate video devices and optionally auto-select a physical webcam
  const updateDeviceList = useCallback(async (): Promise<MediaDeviceInfo[]> => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return [];
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setAvailableDevices(videoInputs);

      // If no device currently selected, pick physical camera first
      if (videoInputs.length > 0) {
        setSelectedDeviceId((current) => {
          if (current && videoInputs.some((d) => d.deviceId === current)) {
            return current;
          }
          const physical = videoInputs.find(isPhysicalWebcam);
          return physical ? physical.deviceId : videoInputs[0].deviceId;
        });
      }

      return videoInputs;
    } catch (err) {
      console.warn('Failed to enumerate media devices:', err);
      return [];
    }
  }, []);

  // Safe element attachment helper
  const attachStreamToVideoElement = useCallback((stream: MediaStream) => {
    const video = videoRef.current;
    if (!video) return;

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', 'true');
    video.setAttribute('muted', 'true');
    video.setAttribute('autoplay', 'true');

    const tryPlay = () => {
      video.play().catch((playErr) => {
        // Autoplay may be deferred until user interaction, which is handled
        console.warn('Video autoPlay deferred:', playErr);
      });
    };

    if (video.readyState >= 1) {
      tryPlay();
    } else {
      video.onloadedmetadata = () => {
        tryPlay();
      };
    }
  }, []);

  // Clean stop for all media tracks and reset DOM bindings
  const stopVideo = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore track stop errors
        }
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch {
        // ignore detach errors
      }
    }

    setIsStreaming(false);
    setIsLoading(false);
  }, []);

  // Map camera errors to helpful user-facing remediation instructions
  const handleCameraError = useCallback((err: any) => {
    setIsStreaming(false);
    setIsLoading(false);

    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      setPermissionState('denied');
      setErrorMessage(
        'Camera permission was denied. Click the lock/camera icon in your browser address bar, set Camera to "Allow", and click Retry.'
      );
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      setPermissionState('not-found');
      setErrorMessage('No camera device detected on your machine. Please connect a webcam and retry.');
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      setPermissionState('error');
      setErrorMessage(
        'Your camera is in use by another application (e.g. Zoom, Teams, or another tab). Close other programs and retry.'
      );
    } else if (err.name === 'OverconstrainedError') {
      setPermissionState('error');
      setErrorMessage('Requested camera resolution could not be satisfied. Retrying with basic settings...');
    } else if (err.name === 'SecurityError') {
      setPermissionState('error');
      setErrorMessage('Camera access was blocked due to a security policy. Ensure you are on HTTPS or localhost.');
    } else {
      setPermissionState('error');
      setErrorMessage(
        `Camera initialization failed (${err.name || 'Error'}): ${err.message || 'Please check device permissions.'}`
      );
    }
  }, []);

  // Safe camera initialization with multi-tier constraint fallback
  const startVideo = useCallback(
    async (targetDeviceId?: string): Promise<boolean> => {
      setErrorMessage(null);
      setIsLoading(true);

      if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setPermissionState('unsupported');
        setErrorMessage(
          'Camera access is not supported by your current browser. Please use Chrome, Edge, Safari, or Firefox over HTTPS or localhost.'
        );
        setIsLoading(false);
        return false;
      }

      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      // Determine device to request
      let chosenDeviceId = targetDeviceId || selectedDeviceId;

      // If we don't have a chosen device yet, enumerate first
      if (!chosenDeviceId) {
        const devices = await updateDeviceList();
        const physical = devices.find(isPhysicalWebcam);
        chosenDeviceId = physical ? physical.deviceId : (devices[0]?.deviceId || '');
      }

      let activeStream: MediaStream | null = null;

      // Attempt 1: Targeted constraints with chosen device
      try {
        const constraints: MediaStreamConstraints = {
          audio: false,
          video: chosenDeviceId
            ? {
                deviceId: { exact: chosenDeviceId },
                width: { ideal: 1280, max: 1920 },
                height: { ideal: 720, max: 1080 }
              }
            : {
                facingMode: 'user',
                width: { ideal: 1280, max: 1920 },
                height: { ideal: 720, max: 1080 }
              }
        };

        activeStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr: any) {
        console.warn('Initial camera constraint failed, trying basic fallback:', firstErr);

        // Attempt 2: Flexible device constraint (ideal instead of exact)
        try {
          activeStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: chosenDeviceId ? { deviceId: { ideal: chosenDeviceId } } : true
          });
        } catch (secondErr: any) {
          console.warn('Ideal device constraint failed, trying generic { video: true }:', secondErr);

          // Attempt 3: Bare minimum { video: true }
          try {
            activeStream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: true
            });
          } catch (thirdErr: any) {
            handleCameraError(thirdErr || secondErr || firstErr);
            return false;
          }
        }
      }

      if (!activeStream) {
        setPermissionState('error');
        setErrorMessage('Failed to acquire a valid video stream from your camera.');
        setIsLoading(false);
        return false;
      }

      const videoTracks = activeStream.getVideoTracks();
      if (videoTracks.length === 0) {
        setPermissionState('error');
        setErrorMessage('Camera stream contains no video tracks.');
        setIsLoading(false);
        return false;
      }

      const activeTrack = videoTracks[0];
      const settings = activeTrack.getSettings ? activeTrack.getSettings() : {};
      if (settings.deviceId) {
        setSelectedDeviceId(settings.deviceId);
      }

      activeTrack.onended = () => {
        setIsStreaming(false);
        setErrorMessage('Camera disconnected.');
      };

      streamRef.current = activeStream;
      setPermissionState('granted');
      setIsStreaming(true);
      setIsLoading(false);

      // Now that camera permission is granted, re-enumerate to get human-readable labels
      await updateDeviceList();

      // Immediately connect to video element if it is already mounted
      attachStreamToVideoElement(activeStream);

      return true;
    },
    [attachStreamToVideoElement, handleCameraError, selectedDeviceId, updateDeviceList]
  );

  // Switch camera device on the fly
  const switchCamera = useCallback(
    async (deviceId: string): Promise<boolean> => {
      setSelectedDeviceId(deviceId);
      return await startVideo(deviceId);
    },
    [startVideo]
  );

  // Synchronize stream with video element whenever isStreaming changes or element mounts
  useEffect(() => {
    if (isStreaming && streamRef.current) {
      attachStreamToVideoElement(streamRef.current);
    }
  }, [isStreaming, attachStreamToVideoElement]);

  // Capture current video frame as high-quality base64 JPEG
  const captureFrameBase64 = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || !isStreaming) {
      return null;
    }

    try {
      const width = video.videoWidth > 0 ? Math.min(video.videoWidth, 1280) : 640;
      const height = video.videoHeight > 0 ? Math.min(video.videoHeight, 720) : 480;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Match visual mirror state if active
      if (isMirrored) {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0, width, height);

      if (isMirrored) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }

      return canvas.toDataURL('image/jpeg', 0.85);
    } catch (err) {
      console.warn('Frame capture failed:', err);
      return null;
    }
  }, [isStreaming, isMirrored]);

  // Clean unmount release
  useEffect(() => {
    return () => {
      stopVideo();
    };
  }, [stopVideo]);

  return {
    videoRef,
    isStreaming,
    isLoading,
    permissionState,
    errorMessage,
    availableDevices,
    selectedDeviceId,
    setSelectedDeviceId,
    isMirrored,
    toggleMirror,
    startVideo,
    stopVideo,
    switchCamera,
    captureFrameBase64
  };
}
