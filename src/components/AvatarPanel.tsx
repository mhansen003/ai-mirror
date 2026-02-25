'use client';

import { useEffect, useRef } from 'react';
import { AvatarRenderer } from '@/lib/avatar-renderer';
import type { ExpressionState } from '@/types/expressions';
import { DEFAULT_EXPRESSION } from '@/types/expressions';

interface AvatarPanelProps {
  expressionRef: React.MutableRefObject<ExpressionState>;
}

export default function AvatarPanel({ expressionRef }: AvatarPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<AvatarRenderer | null>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    rendererRef.current = new AvatarRenderer();

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const loop = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      rendererRef.current!.draw(ctx, rect.width, rect.height, expressionRef.current);
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [expressionRef]);

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
      <canvas ref={canvasRef} className="h-full w-full" />

      {/* Corner decorations */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-2 top-2 h-6 w-6 border-l-2 border-t-2 border-fuchsia-500/40" />
        <div className="absolute right-2 top-2 h-6 w-6 border-r-2 border-t-2 border-fuchsia-500/40" />
        <div className="absolute bottom-2 left-2 h-6 w-6 border-b-2 border-l-2 border-fuchsia-500/40" />
        <div className="absolute bottom-2 right-2 h-6 w-6 border-b-2 border-r-2 border-fuchsia-500/40" />
      </div>

      {/* Label */}
      <div className="absolute right-3 top-3 mr-4 font-mono text-xs tracking-widest text-fuchsia-400/60">
        AI MIRROR
      </div>
    </div>
  );
}
