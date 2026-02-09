/**
 * TidKit Studio - Camera Hook
 * Handles camera access for texture capture and scale detection
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { CameraState } from '@/types/texture';

export interface UseCameraOptions {
  facingMode?: 'user' | 'environment';
  width?: number;
  height?: number;
}

export interface UseCameraReturn {
  state: CameraState;
  videoRef: React.RefObject<HTMLVideoElement>;
  start: () => Promise<void>;
  stop: () => void;
  capture: () => Promise<ImageData | null>;
  switchCamera: () => Promise<void>;
}

export function useCamera(options: UseCameraOptions = {}): UseCameraReturn {
  const { facingMode: initialFacing = 'environment', width = 1920, height = 1080 } = options;

  const [state, setState] = useState<CameraState>({
    isActive: false,
    hasPermission: false,
    facingMode: initialFacing,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  /**
   * Start camera stream
   */
  const start = useCallback(async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: state.facingMode,
          width: { ideal: width },
          height: { ideal: height },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setState((prev) => ({
        ...prev,
        isActive: true,
        hasPermission: true,
        stream,
      }));
    } catch (error) {
      console.error('Camera error:', error);
      setState((prev) => ({
        ...prev,
        isActive: false,
        hasPermission: false,
      }));
      throw error;
    }
  }, [state.facingMode, width, height]);

  /**
   * Stop camera stream
   */
  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setState((prev) => ({
      ...prev,
      isActive: false,
      stream: undefined,
    }));
  }, []);

  /**
   * Capture current frame as ImageData
   */
  const capture = useCallback(async (): Promise<ImageData | null> => {
    const video = videoRef.current;
    if (!video || !state.isActive) return null;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }, [state.isActive]);

  /**
   * Switch between front and back camera
   */
  const switchCamera = useCallback(async () => {
    const newFacing = state.facingMode === 'user' ? 'environment' : 'user';

    // Stop current stream
    stop();

    // Update state and restart with new facing
    setState((prev) => ({ ...prev, facingMode: newFacing }));

    // Small delay to allow state update
    await new Promise((resolve) => setTimeout(resolve, 100));
    await start();
  }, [state.facingMode, stop, start]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    state,
    videoRef: videoRef as React.RefObject<HTMLVideoElement>,
    start,
    stop,
    capture,
    switchCamera,
  };
}
