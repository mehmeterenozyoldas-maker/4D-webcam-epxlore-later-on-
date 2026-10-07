import React from 'react';
import {
  Activity,
  Camera,
  Maximize2,
  RotateCcw,
  Sliders,
  Layers,
  Cpu,
  Eye,
  RefreshCw
} from 'lucide-react';
import { EngineStats } from '../engine/raymarchingEngine';

interface TopBarProps {
  stats: EngineStats;
  showControls: boolean;
  onToggleControls: () => void;
  showOrtho: boolean;
  onToggleOrtho: () => void;
  showLilGui: boolean;
  onToggleLilGui: () => void;
  onResetCamera: () => void;
  onTakeSnapshot: () => void;
  onRestartScan: () => void;
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  stats,
  showControls,
  onToggleControls,
  showOrtho,
  onToggleOrtho,
  showLilGui,
  onToggleLilGui,
  onResetCamera,
  onTakeSnapshot,
  onRestartScan,
  autoRotate,
  onToggleAutoRotate,
}) => {
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const vramMb = (stats.vramBytes / (1024 * 1024)).toFixed(1);

  return (
    <header className="absolute top-0 left-0 right-0 z-40 pointer-events-none p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
      {/* Left: Branding & Status */}
      <div className="pointer-events-auto flex items-center gap-3 bg-black/80 backdrop-blur-md border border-emerald-500/30 px-3.5 py-2 rounded-lg shadow-[0_0_20px_rgba(0,255,150,0.15)]">
        <div className="flex items-center gap-2 text-emerald-400 font-bold tracking-wider">
          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="hidden sm:inline">MRI VOLUMETRIC ENGINE</span>
          <span className="sm:hidden">MRI RAYMARCH</span>
        </div>

        <div className="h-4 w-px bg-emerald-500/30" />

        {/* Live FPS & Diagnostic Pills */}
        <div className="flex items-center gap-2 text-[11px]">
          <span className="flex items-center gap-1 text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            {stats.fps} FPS
          </span>
          <span className="text-gray-500 hidden md:inline">|</span>
          <span className="text-cyan-400 hidden md:inline flex items-center gap-1">
            <Cpu className="w-3 h-3 inline" /> {vramMb} MB VRAM
          </span>
          <span className="text-gray-500 hidden lg:inline">|</span>
          <span className="text-emerald-500/80 hidden lg:inline">
            Z-SLICE {stats.currentSlice}/{stats.depth}
          </span>
        </div>
      </div>

      {/* Right: Quick Actions */}
      <div className="pointer-events-auto flex items-center gap-1.5 bg-black/80 backdrop-blur-md border border-emerald-500/30 p-1 rounded-lg shadow-[0_0_20px_rgba(0,255,150,0.15)]">
        <button
          type="button"
          onClick={onToggleAutoRotate}
          title={autoRotate ? 'Disable Auto Rotation' : 'Enable Auto Rotation'}
          className={`px-2.5 py-1.5 rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
            autoRotate
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'text-gray-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <RotateCcw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
          <span className="hidden md:inline">Orbit</span>
        </button>

        <button
          type="button"
          onClick={onToggleOrtho}
          title="Toggle Orthogonal Multiplanar Slicing"
          className={`px-2.5 py-1.5 rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
            showOrtho
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'text-gray-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden md:inline">MPR Slices</span>
        </button>

        <button
          type="button"
          onClick={onToggleControls}
          title="Toggle Control Console"
          className={`px-2.5 py-1.5 rounded flex items-center gap-1.5 transition-colors cursor-pointer ${
            showControls
              ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/60'
              : 'text-gray-400 hover:text-white hover:bg-white/10'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Console</span>
        </button>

        <button
          type="button"
          onClick={onToggleLilGui}
          title="Toggle lil-gui floating panel"
          className={`px-2 py-1.5 rounded text-[10px] uppercase font-bold tracking-wider transition-colors cursor-pointer ${
            showLilGui
              ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/60'
              : 'text-gray-400 hover:text-white hover:bg-white/10'
          }`}
        >
          lil-gui
        </button>

        <div className="h-4 w-px bg-emerald-500/30 mx-0.5" />

        <button
          type="button"
          onClick={onTakeSnapshot}
          title="Take Hi-Res Snapshot"
          className="p-1.5 rounded text-gray-400 hover:text-emerald-300 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <Camera className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onResetCamera}
          title="Reset Camera View"
          className="p-1.5 rounded text-gray-400 hover:text-emerald-300 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <Eye className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={toggleFullscreen}
          title="Toggle Fullscreen"
          className="p-1.5 rounded text-gray-400 hover:text-emerald-300 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onRestartScan}
          title="Switch Source Feed"
          className="p-1.5 rounded text-gray-400 hover:text-emerald-300 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
