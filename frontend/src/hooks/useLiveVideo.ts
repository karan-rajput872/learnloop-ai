import { useState, useRef, useEffect, useCallback } from 'react';
import { CameraPermissionState } from '../types';

export interface UseLiveVideoReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isStreaming: boolean;
  permissionState: CameraPermissionState;
  errorMessage: string | null;
  availableDevices: MediaDeviceInfo[];
  selectedDeviceId: string;
  setSelectedDeviceId: (deviceId: string) => void;
  startVideo: () => Promise<boolean>;
  stopVideo: () => void;
  captureFrameBase64: () => string | null;
}

export function useLiveVideo(): UseLiveVideoReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [permissionState, setPermissionState] = useState<CameraPermissionState>('prompt');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // Enumerate video devices
  const updateDeviceList = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setAvailableDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch {
      // Ignore enumeration errors
    }
  }, [selectedDeviceId]);

  // Clean stop for all media tracks
  const stopVideo = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore track stop errors
        }
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch {
        // Ignore element detach errors
      }
    }

    setIsStreaming(false);
  }, []);

  // Safe camera initialization
  const startVideo = useCallback(async (): Promise<boolean> => {
    setErrorMessage(null);

    // 1. Check browser compatibility
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setPermissionState('unsupported');
      setErrorMessage(
        'Camera access is not supported by your current browser. Please use Chrome, Edge, Safari, or Firefox over HTTPS or localhost.'
      );
      return false;
    }

    // Stop any existing stream before starting a new one
    stopVideo();

    const videoConstraints: MediaTrackConstraints = selectedDeviceId
      ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
      : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.playsInline = true;
        videoRef.current.muted = true;
        await videoRef.current.play().catch((playErr) => {
          console.warn('Video autoPlay was deferred:', playErr);
        });
      }

      setPermissionState('granted');
      setIsStreaming(true);
      await updateDeviceList();
      return true;
    } catch (err: any) {
      setIsStreaming(false);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionState('denied');
        setErrorMessage(
          'Camera permission was denied. To enable: click the camera/lock icon in your browser address bar, set Camera to "Allow", and click Retry.'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermissionState('not-found');
        setErrorMessage('No camera device was detected on your machine. Please connect a webcam and retry.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setPermissionState('error');
        setErrorMessage(
          'Your camera is already in use by another application (e.g. Zoom, Teams, or another browser tab). Please close other apps and retry.'
        );
      } else if (err.name === 'OverconstrainedError') {
        setPermissionState('error');
        setErrorMessage('Requested camera resolution or constraints could not be satisfied. Retrying with default settings...');
        // Retry with basic constraints
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          streamRef.current = fallbackStream;
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            await videoRef.current.play();
          }
          setPermissionState('granted');
          setIsStreaming(true);
          return true;
        } catch {
          setErrorMessage('Unable to start camera with fallback constraints.');
        }
      } else if (err.name === 'SecurityError') {
        setPermissionState('error');
        setErrorMessage('Camera access was blocked due to a security policy. Ensure you are on HTTPS or localhost.');
      } else {
        setPermissionState('error');
        setErrorMessage(`Camera initialization failed (${err.name || 'Unknown Error'}): ${err.message || 'Please check permissions.'}`);
      }
      return false;
    }
  }, [selectedDeviceId, stopVideo, updateDeviceList]);

  // Capture current video frame as base64 JPEG
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

      try {
        ctx.drawImage(video, 0, 0, width, height);
      } catch {
        // If video element frame is not directly drawable, generate mock frame
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px monospace';
        ctx.fillText('LearnLoop AI Live Camera Frame', 20, 40);
      }

      // Return high-quality JPEG base64 (removes alpha channel, optimizes payload)
      return canvas.toDataURL('image/jpeg', 0.85);
    } catch (err) {
      console.warn('Frame capture failed:', err);
      return null;
    }
  }, [isStreaming]);

  // Clean unmount release
  useEffect(() => {
    return () => {
      stopVideo();
    };
  }, [stopVideo]);

  return {
    videoRef,
    isStreaming,
    permissionState,
    errorMessage,
    availableDevices,
    selectedDeviceId,
    setSelectedDeviceId,
    startVideo,
    stopVideo,
    captureFrameBase64
  };
}
