'use client';

import { useRef } from 'react';
import WebcamPanel from '@/components/WebcamPanel';
import AvatarPanel from '@/components/AvatarPanel';
import type { ExpressionState } from '@/types/expressions';
import { DEFAULT_EXPRESSION } from '@/types/expressions';

export default function Home() {
  // Shared expression ref — written by WebcamPanel, read by AvatarPanel
  // Using useRef instead of useState avoids re-renders on every frame (~30fps)
  const expressionRef = useRef<ExpressionState>({ ...DEFAULT_EXPRESSION });

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#050510]">
      {/* Header */}
      <header className="absolute left-0 right-0 top-0 z-40 flex items-center justify-center py-3">
        <h1 className="neon-text font-[family-name:var(--font-orbitron)] text-lg font-bold tracking-[0.3em] text-cyan-400 md:text-xl">
          AI MIRROR
        </h1>
      </header>

      {/* Main split layout */}
      <main className="flex h-full w-full flex-col pt-12 md:flex-row md:pt-0">
        {/* Webcam — left/top */}
        <div className="divider-glow h-1/2 w-full md:h-full md:w-1/2 lg:w-1/2">
          <WebcamPanel onExpression={expressionRef} />
        </div>

        {/* Avatar — right/bottom */}
        <div className="h-1/2 w-full md:h-full md:w-1/2 lg:w-1/2">
          <AvatarPanel expressionRef={expressionRef} />
        </div>
      </main>

      {/* Vignette overlay */}
      <div className="vignette" />
    </div>
  );
}
