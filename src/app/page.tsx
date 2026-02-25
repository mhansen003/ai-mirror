'use client';

import { useRef, useState } from 'react';
import WebcamPanel from '@/components/WebcamPanel';
import AvatarPanel from '@/components/AvatarPanel';
import type { ExpressionState } from '@/types/expressions';
import { DEFAULT_EXPRESSION } from '@/types/expressions';

export type AvatarMode = 'ai' | 'mirror';

export default function Home() {
  const expressionRef = useRef<ExpressionState>({ ...DEFAULT_EXPRESSION });
  const [mode, setMode] = useState<AvatarMode>('ai');

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#050510]">
      {/* Header */}
      <header className="absolute left-0 right-0 top-0 z-40 flex items-center justify-center py-3">
        <h1 className="neon-text font-[family-name:var(--font-orbitron)] text-lg font-bold tracking-[0.3em] text-cyan-400 md:text-xl">
          AI MIRROR
        </h1>
      </header>

      {/* Main split layout */}
      <main className="flex h-full w-full flex-col pt-12 pb-14 md:flex-row md:pt-0 md:pb-14">
        {/* Webcam — left/top */}
        <div className="divider-glow h-1/2 w-full md:h-full md:w-1/2 lg:w-1/2">
          <WebcamPanel onExpression={expressionRef} />
        </div>

        {/* Avatar — right/bottom */}
        <div className="h-1/2 w-full md:h-full md:w-1/2 lg:w-1/2">
          <AvatarPanel expressionRef={expressionRef} mode={mode} />
        </div>
      </main>

      {/* Mode toggle bar — z-[60] to sit above the vignette (z-50) */}
      <div className="absolute bottom-0 left-0 right-0 z-[60] flex items-center justify-center py-3">
        <div className="mode-toggle flex items-center gap-1 rounded-full border border-white/10 bg-black/60 p-1 backdrop-blur-md">
          <button
            onClick={() => setMode('ai')}
            className={`mode-btn rounded-full px-5 py-1.5 font-[family-name:var(--font-orbitron)] text-xs font-medium tracking-wider transition-all duration-300 ${
              mode === 'ai'
                ? 'bg-fuchsia-500/20 text-fuchsia-400 shadow-[0_0_12px_rgba(255,0,255,0.25)]'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            AI
          </button>
          <button
            onClick={() => setMode('mirror')}
            className={`mode-btn rounded-full px-5 py-1.5 font-[family-name:var(--font-orbitron)] text-xs font-medium tracking-wider transition-all duration-300 ${
              mode === 'mirror'
                ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_12px_rgba(0,255,255,0.25)]'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            MIRROR
          </button>
        </div>
      </div>

      {/* Vignette overlay */}
      <div className="vignette" />
    </div>
  );
}
