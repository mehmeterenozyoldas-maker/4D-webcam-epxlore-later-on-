import React, { useState } from 'react';
import { Camera, Film, Brain, Activity, Upload, Sparkles, AlertCircle } from 'lucide-react';
import { RaymarchConfig } from '../engine/raymarchingEngine';

interface MriHudOverlayProps {
  onStart: (source: RaymarchConfig['source'], file?: File) => Promise<void>;
  errorMessage: string | null;
}

export const MriHudOverlay: React.FC<MriHudOverlayProps> = ({ onStart, errorMessage }) => {
  const [selectedSource, setSelectedSource] = useState<RaymarchConfig['source']>('Synthetic Brain');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = async () => {
    setIsStarting(true);
    try {
      await onStart(selectedSource, selectedFile || undefined);
    } catch {
      setIsStarting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setSelectedSource('Custom Video');
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 transition-all duration-700">
      {/* Sci-fi corner brackets */}
      <div className="absolute top-8 left-8 w-12 h-12 border-t-2 border-l-2 border-emerald-400/60 pointer-events-none" />
      <div className="absolute top-8 right-8 w-12 h-12 border-t-2 border-r-2 border-emerald-400/60 pointer-events-none" />
      <div className="absolute bottom-8 left-8 w-12 h-12 border-b-2 border-l-2 border-emerald-400/60 pointer-events-none" />
      <div className="absolute bottom-8 right-8 w-12 h-12 border-b-2 border-r-2 border-emerald-400/60 pointer-events-none" />

      {/* Center UI Container */}
      <div
        id="ui-container"
        className="relative max-w-lg w-full text-center bg-emerald-950/30 border border-emerald-500/50 p-8 md:p-10 rounded-xl backdrop-blur-2xl shadow-[0_0_60px_rgba(0,255,150,0.25)] flex flex-col items-center"
      >
        {/* Subtle grid pattern background */}
        <div
          className="absolute inset-0 rounded-xl opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle, #00ff99 1px, transparent 1px), linear-gradient(to right, rgba(0,255,150,0.1) 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }}
        />

        <div className="flex items-center gap-2 mb-2 px-3 py-1 rounded-full border border-emerald-400/30 bg-emerald-950/60 text-emerald-400 text-xs font-mono tracking-widest uppercase">
          <Sparkles className="w-3.5 h-3.5 animate-pulse text-emerald-300" />
          <span>WebGL2 Volumetric Raymarching</span>
        </div>

        <h1
          id="title-hud"
          className="text-2xl md:text-3xl font-extrabold tracking-[0.25em] text-emerald-400 drop-shadow-[0_0_20px_rgba(0,255,150,0.8)] font-mono uppercase mt-2 mb-1"
        >
          VOLUMETRIC RAYMARCHER
        </h1>

        <p
          id="sub-hud"
          className="text-cyan-400/90 text-xs md:text-sm font-mono tracking-[0.2em] mb-6 uppercase"
        >
          TRUE 3D ACCUMULATION ENGINE
        </p>

        {/* Source feed selector */}
        <div className="w-full mb-6 text-left">
          <label className="block text-[11px] font-mono uppercase tracking-wider text-emerald-400/80 mb-2">
            Select Input Feed / Data Stream:
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <button
              type="button"
              onClick={() => setSelectedSource('Synthetic Brain')}
              className={`p-2.5 rounded border flex items-center gap-2 transition-all ${
                selectedSource === 'Synthetic Brain'
                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(0,255,150,0.3)]'
                  : 'border-emerald-500/30 bg-black/40 text-gray-400 hover:border-emerald-400/60 hover:text-white'
              }`}
            >
              <Brain className="w-4 h-4 text-emerald-400" />
              <div className="text-left">
                <div className="font-bold">Synthetic Brain</div>
                <div className="text-[10px] text-emerald-500/70">100-slice MRI phantom</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedSource('CT Chest Phantom')}
              className={`p-2.5 rounded border flex items-center gap-2 transition-all ${
                selectedSource === 'CT Chest Phantom'
                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(0,255,150,0.3)]'
                  : 'border-emerald-500/30 bg-black/40 text-gray-400 hover:border-emerald-400/60 hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4 text-emerald-400" />
              <div className="text-left">
                <div className="font-bold">CT Chest/Spine</div>
                <div className="text-[10px] text-emerald-500/70">Ribs & lungs phantom</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedSource('Video')}
              className={`p-2.5 rounded border flex items-center gap-2 transition-all ${
                selectedSource === 'Video'
                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(0,255,150,0.3)]'
                  : 'border-emerald-500/30 bg-black/40 text-gray-400 hover:border-emerald-400/60 hover:text-white'
              }`}
            >
              <Film className="w-4 h-4 text-emerald-400" />
              <div className="text-left">
                <div className="font-bold">Sample Video</div>
                <div className="text-[10px] text-emerald-500/70">Sintel motion slices</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedSource('Webcam')}
              className={`p-2.5 rounded border flex items-center gap-2 transition-all ${
                selectedSource === 'Webcam'
                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(0,255,150,0.3)]'
                  : 'border-emerald-500/30 bg-black/40 text-gray-400 hover:border-emerald-400/60 hover:text-white'
              }`}
            >
              <Camera className="w-4 h-4 text-emerald-400" />
              <div className="text-left">
                <div className="font-bold">Live Webcam</div>
                <div className="text-[10px] text-emerald-500/70">Realtime holographic scan</div>
              </div>
            </button>
          </div>

          {/* Custom upload row */}
          <div className="mt-2.5">
            <label className="flex items-center justify-center gap-2 w-full p-2 rounded border border-dashed border-emerald-500/40 bg-black/30 hover:bg-emerald-950/20 hover:border-emerald-400/70 cursor-pointer text-xs font-mono text-emerald-400 transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>
                {selectedFile ? `Selected: ${selectedFile.name}` : 'Or upload video file (.mp4, .webm, baby.mp4)'}
              </span>
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Start Button */}
        <button
          id="start-btn"
          type="button"
          onClick={handleStart}
          disabled={isStarting}
          className="w-full py-4 px-8 text-base md:text-lg font-bold font-mono tracking-[0.25em] text-black bg-emerald-400 hover:bg-white rounded border border-emerald-400 transition-all duration-300 shadow-[0_0_30px_rgba(0,255,150,0.6)] hover:shadow-[0_0_40px_rgba(255,255,255,0.9)] cursor-pointer active:scale-98 disabled:opacity-50"
        >
          {isStarting ? 'GENERATING RAYS...' : 'INITIATE SCAN'}
        </button>

        {/* Error message */}
        {errorMessage && (
          <div id="error-msg" className="flex items-center gap-2 mt-4 text-xs font-mono text-rose-400 bg-rose-950/40 border border-rose-500/40 p-2.5 rounded">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="mt-6 text-[10px] font-mono text-gray-500 flex items-center gap-4">
          <span>WebGL2 / GLSL 3.0 ES</span>
          <span>•</span>
          <span>256³ Raymarch Grid</span>
          <span>•</span>
          <span>Bloom Post-Pass</span>
        </div>
      </div>
    </div>
  );
};
