/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  RaymarchingEngine,
  RaymarchConfig,
  DEFAULT_CONFIG,
  EngineStats,
} from './engine/raymarchingEngine';
import { MriHudOverlay } from './components/MriHudOverlay';
import { TopBar } from './components/TopBar';
import { ControlPanel } from './components/ControlPanel';
import { OrthoSliceViews } from './components/OrthoSliceViews';

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lilGuiMountRef = useRef<HTMLDivElement | null>(null);
  const [engine, setEngine] = useState<RaymarchingEngine | null>(null);

  // App UI State
  const [isScanInitiated, setIsScanInitiated] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [config, setConfig] = useState<RaymarchConfig>(DEFAULT_CONFIG);
  const [showControls, setShowControls] = useState(true);
  const [showOrtho, setShowOrtho] = useState(true);
  const [showLilGui, setShowLilGui] = useState(false);
  const [stats, setStats] = useState<EngineStats>({
    fps: 60,
    currentSlice: 0,
    depth: 100,
    vramBytes: 256 * 256 * 100 * 4,
    activeSource: 'Synthetic Brain',
    isStreaming: false,
  });

  // Initialize Raymarching Engine once container is mounted
  useEffect(() => {
    if (!containerRef.current) return;

    const eng = new RaymarchingEngine(containerRef.current, {
      ...DEFAULT_CONFIG,
      source: 'Synthetic Brain',
    });

    eng.onStatsUpdate = (newStats) => {
      setStats(newStats);
    };

    eng.onError = (msg) => {
      setErrorMessage(msg);
    };

    setEngine(eng);

    // Keyboard navigation shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        eng.config.autoScrub = !eng.config.autoScrub;
        setConfig((prev) => ({ ...prev, autoScrub: eng.config.autoScrub }));
      } else if (e.code === 'KeyR') {
        eng.resetCamera();
      } else if (e.code === 'KeyC') {
        setShowControls((prev) => !prev);
      } else if (e.code === 'KeyM') {
        setShowOrtho((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      eng.destroy();
    };
  }, []);

  // Sync lil-gui when toggled
  useEffect(() => {
    if (!engine) return;

    if (showLilGui) {
      if (lilGuiMountRef.current) {
        engine.setupLilGui(lilGuiMountRef.current);
      }
    } else {
      engine.destroyLilGui();
    }
  }, [showLilGui, engine]);

  // Handle Initial Scan Trigger
  const handleInitiateScan = async (source: RaymarchConfig['source'], file?: File) => {
    if (!engine) return;
    setErrorMessage(null);

    try {
      await engine.switchSource(source, file);
      engine.start();
      setIsScanInitiated(true);
      setConfig((prev) => ({ ...prev, source }));
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage('Scan initiation error: ' + (error?.message || 'Unknown error'));
      throw err;
    }
  };

  // Switch source during active session
  const handleSourceChange = async (source: RaymarchConfig['source'], file?: File) => {
    if (!engine) return;
    setErrorMessage(null);
    try {
      await engine.switchSource(source, file);
      setConfig((prev) => ({ ...prev, source }));
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage('Feed switch failed: ' + (error?.message || 'Unknown error'));
    }
  };

  const handleConfigChange = (newValues: Partial<RaymarchConfig>) => {
    setConfig((prev) => ({ ...prev, ...newValues }));
  };

  const handleTakeSnapshot = () => {
    if (!engine) return;
    const dataUrl = engine.takeSnapshot();
    const link = document.createElement('a');
    link.download = `volumetric-mri-scan-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleResetCamera = () => {
    engine?.resetCamera();
  };

  const handleToggleAutoRotate = () => {
    if (!engine) return;
    const next = !config.autoRotate;
    engine.setAutoRotate(next);
    setConfig((prev) => ({ ...prev, autoRotate: next }));
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black text-white select-none">
      {/* 1. Canvas Mounting Container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* 2. CRT scanline visual filter */}
      <div className="scanline-overlay absolute inset-0 z-10 pointer-events-none opacity-40" />

      {/* 3. Initial HUD Overlay (Initiate Scan) */}
      {!isScanInitiated && (
        <MriHudOverlay
          onStart={handleInitiateScan}
          errorMessage={errorMessage}
        />
      )}

      {/* 4. Active Cockpit UI */}
      {isScanInitiated && (
        <>
          {/* Top Bar with Diagnostics */}
          <TopBar
            stats={stats}
            showControls={showControls}
            onToggleControls={() => setShowControls((prev) => !prev)}
            showOrtho={showOrtho}
            onToggleOrtho={() => setShowOrtho((prev) => !prev)}
            showLilGui={showLilGui}
            onToggleLilGui={() => setShowLilGui((prev) => !prev)}
            onResetCamera={handleResetCamera}
            onTakeSnapshot={handleTakeSnapshot}
            onRestartScan={() => setIsScanInitiated(false)}
            autoRotate={config.autoRotate}
            onToggleAutoRotate={handleToggleAutoRotate}
          />

          {/* Right Floating Control Console */}
          {showControls && (
            <ControlPanel
              engine={engine}
              config={config}
              onConfigChange={handleConfigChange}
              onSourceChange={handleSourceChange}
              onClose={() => setShowControls(false)}
            />
          )}

          {/* Left Bottom Multi-Planar Orthogonal Slices */}
          {showOrtho && (
            <div className="absolute left-3 bottom-3 z-30 pointer-events-auto">
              <OrthoSliceViews engine={engine} tintColor={config.tint} />
            </div>
          )}

          {/* Mount point for lil-gui if activated */}
          <div
            ref={lilGuiMountRef}
            className={`absolute top-16 right-3 z-50 pointer-events-auto transition-opacity ${
              showLilGui ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          />

          {/* Bottom Center Quick Z-Depth Scrubber bar */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 pointer-events-auto bg-black/80 backdrop-blur-md border border-emerald-500/30 px-4 py-2 rounded-full flex items-center gap-3 text-xs font-mono shadow-[0_0_20px_rgba(0,255,150,0.15)] max-w-sm w-full mx-auto">
            <span className="text-emerald-400 font-bold shrink-0">Z-SLICE</span>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.01"
              value={config.playback}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setConfig((prev) => ({ ...prev, playback: val }));
                engine?.setPlayback(val);
              }}
              className="w-full accent-emerald-400 bg-emerald-950/80 h-1.5 rounded cursor-pointer"
            />
            <span className="text-emerald-300 w-10 text-right font-bold">
              {Math.round(config.playback * 100)}%
            </span>
          </div>

          {/* Corner Sci-Fi Telemetry Ticks */}
          <div className="absolute top-16 left-3 z-20 pointer-events-none text-[10px] font-mono text-emerald-500/60 flex flex-col gap-0.5">
            <div>ACQ_MODE: VOLUMETRIC_ACCUMULATION</div>
            <div>VOXEL_GRID: 256x256x100</div>
            <div>SHADER: GLSL_300_ES_RAYMARCHER</div>
            <div>ISOSURFACE: EXTRACTED</div>
            <div>STATUS: RAY_ACCUMULATION_ONLINE</div>
          </div>
        </>
      )}
    </main>
  );
}
