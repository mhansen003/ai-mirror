'use client';

import { useEffect, useRef } from 'react';
import { AvatarRenderer } from '@/lib/avatar-renderer';
import { BehaviorEngine } from '@/lib/behavior-engine';
import { lerpExpression } from '@/lib/lerp';
import type { ExpressionState, BehaviorOutput } from '@/types/expressions';
import { DEFAULT_EXPRESSION } from '@/types/expressions';
import type { AvatarMode } from '@/app/page';

interface AvatarPanelProps {
  expressionRef: React.MutableRefObject<ExpressionState>;
  mode: AvatarMode;
}

export default function AvatarPanel({ expressionRef, mode }: AvatarPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<AvatarRenderer | null>(null);
  const behaviorRef = useRef<BehaviorEngine | null>(null);
  const animFrameRef = useRef<number>(0);
  const modeRef = useRef<AvatarMode>(mode);
  const mirrorSmoothedRef = useRef<ExpressionState>({ ...DEFAULT_EXPRESSION });

  // Keep modeRef in sync without triggering effect re-run
  modeRef.current = mode;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    rendererRef.current = new AvatarRenderer();
    behaviorRef.current = new BehaviorEngine();

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

      if (modeRef.current === 'ai') {
        // AI Mode: behavior engine decides the avatar's expression
        const behavior = behaviorRef.current!.update(expressionRef.current);
        rendererRef.current!.draw(ctx, rect.width, rect.height, behavior);
      } else {
        // Mirror Mode: avatar copies user's expression directly
        mirrorSmoothedRef.current = lerpExpression(
          mirrorSmoothedRef.current,
          expressionRef.current,
          0.2
        );
        const mirrorBehavior: BehaviorOutput = {
          avatarExpression: mirrorSmoothedRef.current,
          mode: 'idle',
          displayText: '',
          subText: 'MIRROR MODE',
          energy: 0.4,
          flashColor: null,
        };
        rendererRef.current!.draw(ctx, rect.width, rect.height, mirrorBehavior);
      }

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
        {mode === 'ai' ? 'AI MODE' : 'MIRROR MODE'}
      </div>
    </div>
  );
}
