'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { initFaceTracker, detectFace } from '@/lib/face-tracker';
import { extractExpression } from '@/lib/expression-extractor';
import { lerpExpression } from '@/lib/lerp';
import type { ExpressionState } from '@/types/expressions';
import { DEFAULT_EXPRESSION } from '@/types/expressions';

interface WebcamPanelProps {
  onExpression: React.MutableRefObject<ExpressionState>;
}

export default function WebcamPanel({ onExpression }: WebcamPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const smoothedRef = useRef<ExpressionState>({ ...DEFAULT_EXPRESSION });
  const animFrameRef = useRef<number>(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const startDetectionLoop = useCallback(() => {
    let lastTimestamp = -1;

    const loop = () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(loop);
        return;
      }

      const now = performance.now();
      // MediaPipe requires strictly increasing timestamps
      if (now <= lastTimestamp) {
        animFrameRef.current = requestAnimationFrame(loop);
        return;
      }
      lastTimestamp = now;

      const result = detectFace(video, now);
      if (result) {
        const raw = extractExpression(result);
        if (raw) {
          // Smooth with lerp for natural feel
          smoothedRef.current = lerpExpression(smoothedRef.current, raw, 0.2);
          // Write directly to shared ref — no React re-render
          Object.assign(onExpression.current, smoothedRef.current);
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
  }, [onExpression]);

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function init() {
      try {
        // Start camera and model loading in parallel
        const [mediaStream] = await Promise.all([
          navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: 'user' },
          }),
          initFaceTracker(),
        ]);

        stream = mediaStream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setStatus('ready');
          startDetectionLoop();
        }
      } catch (err) {
        console.error('Webcam/tracker init failed:', err);
        setStatus('error');
        setErrorMsg(
          err instanceof DOMException && err.name === 'NotAllowedError'
            ? 'Camera access denied. Please allow camera access and reload.'
            : 'Failed to initialize. Please use Chrome or Edge.'
        );
      }
    }

    init();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [startDetectionLoop]);

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-black/30 backdrop-blur-sm">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
        playsInline
        muted
      />

      {/* Status overlay */}
      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <p className="mt-4 font-mono text-sm text-cyan-400">INITIALIZING FACE TRACKER...</p>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6">
          <p className="text-center font-mono text-sm text-red-400">{errorMsg}</p>
        </div>
      )}

      {/* Corner decorations */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-2 top-2 h-6 w-6 border-l-2 border-t-2 border-cyan-400/40" />
        <div className="absolute right-2 top-2 h-6 w-6 border-r-2 border-t-2 border-cyan-400/40" />
        <div className="absolute bottom-2 left-2 h-6 w-6 border-b-2 border-l-2 border-cyan-400/40" />
        <div className="absolute bottom-2 right-2 h-6 w-6 border-b-2 border-r-2 border-cyan-400/40" />
      </div>

      {/* Label */}
      <div className="absolute left-3 top-3 ml-4 font-mono text-xs tracking-widest text-cyan-400/60">
        LIVE FEED
      </div>
    </div>
  );
}
