import React, { useRef } from 'react';
import {
  Sliders,
  Sparkles,
  Scissors,
  Layers,
  Palette,
  Eye,
  Upload,
  Play,
  Pause,
  RotateCcw,
  Film,
  Camera,
  Brain,
  Activity,
  Check
} from 'lucide-react';
import { RaymarchConfig, RaymarchingEngine } from '../engine/raymarchingEngine';

interface ControlPanelProps {
  engine: RaymarchingEngine | null;
  config: RaymarchConfig;
  onConfigChange: (newConfig: Partial<RaymarchConfig>) => void;
  onSourceChange: (source: RaymarchConfig['source'], file?: File) => void;
  onClose: () => void;
}

const COLOR_PRESETS = [
  { name: 'Emerald', hex: '#00ff99' },
  { name: 'Cyan', hex: '#00e5ff' },
  { name: 'Cobalt', hex: '#3b82f6' },
  { name: 'Amber', hex: '#ffaa00' },
  { name: 'Violet', hex: '#c084fc' },
  { name: 'Ruby', hex: '#f43f5e' },
  { name: 'White', hex: '#f8fafc' },
];

export const ControlPanel: React.FC<ControlPanelProps> = ({
  engine,
  config,
  onConfigChange,
  onSourceChange,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSourceChange('Custom Video', file);
    }
  };

  return (
    <aside className="absolute right-3 top-16 bottom-3 z-40 w-80 md:w-88 max-w-[calc(100vw-24px)] flex flex-col bg-black/85 backdrop-blur-xl border border-emerald-500/40 rounded-xl shadow-[0_0_40px_rgba(0,255,150,0.2)] text-xs font-mono text-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-emerald-500/30 bg-emerald-950/40">
        <div className="flex items-center gap-2 text-emerald-400 font-bold tracking-wider uppercase">
          <Sliders className="w-4 h-4" />
          <span>MRI RAYMARCHER CONSOLE</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-white px-2 py-0.5 rounded border border-transparent hover:border-gray-600 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Scrollable controls */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
        {/* SECTION 1: Source Feed */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-emerald-400 font-semibold tracking-wider">
            <span className="flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5" /> SOURCE FEED
            </span>
            <span className="text-[10px] text-emerald-500/70">{config.source}</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => onSourceChange('Synthetic Brain')}
              className={`p-2 rounded border text-left flex items-center gap-1.5 transition-all ${
                config.source === 'Synthetic Brain'
                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 font-bold'
                  : 'border-emerald-500/20 bg-black/50 text-gray-400 hover:border-emerald-400/50'
              }`}
            >
              <Brain className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">Brain Phantom</span>
            </button>

            <button
              type="button"
              onClick={() => onSourceChange('CT Chest Phantom')}
              className={`p-2 rounded border text-left flex items-center gap-1.5 transition-all ${
                config.source === 'CT Chest Phantom'
                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 font-bold'
                  : 'border-emerald-500/20 bg-black/50 text-gray-400 hover:border-emerald-400/50'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">CT Phantom</span>
            </button>

            <button
              type="button"
              onClick={() => onSourceChange('Video')}
              className={`p-2 rounded border text-left flex items-center gap-1.5 transition-all ${
                config.source === 'Video'
                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 font-bold'
                  : 'border-emerald-500/20 bg-black/50 text-gray-400 hover:border-emerald-400/50'
              }`}
            >
              <Film className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">Sample Video</span>
            </button>

            <button
              type="button"
              onClick={() => onSourceChange('Webcam')}
              className={`p-2 rounded border text-left flex items-center gap-1.5 transition-all ${
                config.source === 'Webcam'
                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 font-bold'
                  : 'border-emerald-500/20 bg-black/50 text-gray-400 hover:border-emerald-400/50'
              }`}
            >
              <Camera className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">Live Webcam</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full mt-1.5 p-2 rounded border border-dashed border-emerald-500/40 bg-black/40 hover:bg-emerald-950/30 text-emerald-400 flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Custom Video File</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* SECTION 2: Volumetric Engine */}
        <div className="space-y-3 pt-2 border-t border-emerald-500/20">
          <div className="text-emerald-400 font-semibold tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" /> VOLUMETRIC ENGINE
          </div>

          {/* Isolate Brightness / Threshold */}
          <div className="space-y-1">
            <div className="flex justify-between text-gray-300">
              <span>Isolate Brightness (Threshold)</span>
              <span className="text-emerald-400">{config.threshold.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.01"
              value={config.threshold}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onConfigChange({ threshold: val });
                engine?.setThreshold(val);
              }}
              className="w-full accent-emerald-400 bg-emerald-950/60 h-1.5 rounded cursor-pointer"
            />
            <div className="text-[10px] text-gray-500">Culls dark voxels (removes video background)</div>
          </div>

          {/* Volume Density */}
          <div className="space-y-1">
            <div className="flex justify-between text-gray-300">
              <span>Volume Density</span>
              <span className="text-emerald-400">{config.density.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="10.0"
              step="0.1"
              value={config.density}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onConfigChange({ density: val });
                engine?.setDensity(val);
              }}
              className="w-full accent-emerald-400 bg-emerald-950/60 h-1.5 rounded cursor-pointer"
            />
          </div>

          {/* Steps */}
          <div className="space-y-1">
            <div className="flex justify-between text-gray-300">
              <span>Ray Quality (Steps)</span>
              <span className="text-emerald-400">{config.steps}</span>
            </div>
            <input
              type="range"
              min="32"
              max="256"
              step="4"
              value={config.steps}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                onConfigChange({ steps: val });
                engine?.setSteps(val);
              }}
              className="w-full accent-emerald-400 bg-emerald-950/60 h-1.5 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* SECTION 3: Time Slider & Slicing */}
        <div className="space-y-3 pt-2 border-t border-emerald-500/20">
          <div className="flex items-center justify-between text-emerald-400 font-semibold tracking-wider">
            <span className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" /> TIME SLIDER / Z-SLICE
            </span>
            <button
              type="button"
              onClick={() => {
                const next = !config.autoScrub;
                onConfigChange({ autoScrub: next });
              }}
              className={`px-1.5 py-0.5 rounded flex items-center gap-1 text-[10px] border ${
                config.autoScrub
                  ? 'border-emerald-400 bg-emerald-500/30 text-emerald-300'
                  : 'border-gray-700 text-gray-400'
              }`}
            >
              {config.autoScrub ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
              {config.autoScrub ? 'Scrubbing' : 'Paused'}
            </button>
          </div>

          {/* Z-Slice Playback */}
          <div className="space-y-1">
            <div className="flex justify-between text-gray-300">
              <span>Slice Focus (Z-Depth)</span>
              <span className="text-emerald-400">{Math.round(config.playback * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.01"
              value={config.playback}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onConfigChange({ playback: val });
                engine?.setPlayback(val);
              }}
              className="w-full accent-emerald-400 bg-emerald-950/60 h-1.5 rounded cursor-pointer"
            />
          </div>

          {/* Trail Length */}
          <div className="space-y-1">
            <div className="flex justify-between text-gray-300">
              <span>Trail Length</span>
              <span className="text-emerald-400">{config.trailLength.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.01"
              max="1.0"
              step="0.01"
              value={config.trailLength}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onConfigChange({ trailLength: val });
                engine?.setTrailLength(val);
              }}
              className="w-full accent-emerald-400 bg-emerald-950/60 h-1.5 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* SECTION 4: Hologram FX & Colormap */}
        <div className="space-y-3 pt-2 border-t border-emerald-500/20">
          <div className="text-emerald-400 font-semibold tracking-wider flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5" /> HOLOGRAM FX & COLORMAP
          </div>

          {/* Color Mode Selection */}
          <div className="grid grid-cols-2 gap-1.5">
            {(
              [
                { mode: 'tint', label: 'Tinted Neon' },
                { mode: 'thermal', label: 'Thermal Heat' },
                { mode: 'spectral', label: 'Spectral' },
                { mode: 'xray', label: 'Clinical X-Ray' },
              ] as const
            ).map((m) => (
              <button
                key={m.mode}
                type="button"
                onClick={() => {
                  onConfigChange({ colorMode: m.mode });
                  engine?.setColorMode(m.mode);
                }}
                className={`p-1.5 rounded border text-center transition-all ${
                  config.colorMode === m.mode
                    ? 'border-emerald-400 bg-emerald-500/25 text-emerald-300 font-bold'
                    : 'border-emerald-500/20 bg-black/40 text-gray-400 hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Tint Color Swatches */}
          {config.colorMode === 'tint' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-gray-300">
                <span>Neon Tint</span>
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-white/40"
                    style={{ backgroundColor: config.tint }}
                  />
                  <input
                    type="color"
                    value={config.tint}
                    onChange={(e) => {
                      onConfigChange({ tint: e.target.value });
                      engine?.setTint(e.target.value);
                    }}
                    className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                  />
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    title={preset.name}
                    onClick={() => {
                      onConfigChange({ tint: preset.hex });
                      engine?.setTint(preset.hex);
                    }}
                    className="w-6 h-6 rounded-full border border-white/20 transition-transform hover:scale-110 flex items-center justify-center cursor-pointer"
                    style={{ backgroundColor: preset.hex }}
                  >
                    {config.tint.toLowerCase() === preset.hex.toLowerCase() && (
                      <Check className="w-3 h-3 text-black stroke-[3]" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Core Glow (Bloom) */}
          <div className="space-y-1">
            <div className="flex justify-between text-gray-300">
              <span>Core Glow (Bloom)</span>
              <span className="text-emerald-400">{config.bloomStrength.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="3.0"
              step="0.05"
              value={config.bloomStrength}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onConfigChange({ bloomStrength: val });
                engine?.setBloomStrength(val);
              }}
              className="w-full accent-emerald-400 bg-emerald-950/60 h-1.5 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* SECTION 5: Dynamic 3D Clipping Planes */}
        <div className="space-y-3 pt-2 border-t border-emerald-500/20">
          <div className="text-emerald-400 font-semibold tracking-wider flex items-center gap-1.5">
            <Scissors className="w-3.5 h-3.5" /> 3D VOLUME CLIPPING PLANES
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-gray-300">
              <span>Clip X (Sagittal Cut)</span>
              <span className="text-emerald-400">{Math.round(config.clipX * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.01"
              value={config.clipX}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onConfigChange({ clipX: val });
                engine?.setClipping(val, config.clipY, config.clipZ);
              }}
              className="w-full accent-emerald-400 bg-emerald-950/60 h-1.5 rounded cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-gray-300">
              <span>Clip Y (Coronal Cut)</span>
              <span className="text-emerald-400">{Math.round(config.clipY * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.01"
              value={config.clipY}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onConfigChange({ clipY: val });
                engine?.setClipping(config.clipX, val, config.clipZ);
              }}
              className="w-full accent-emerald-400 bg-emerald-950/60 h-1.5 rounded cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-gray-300">
              <span>Clip Z (Axial Cut)</span>
              <span className="text-emerald-400">{Math.round(config.clipZ * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.01"
              value={config.clipZ}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onConfigChange({ clipZ: val });
                engine?.setClipping(config.clipX, config.clipY, val);
              }}
              className="w-full accent-emerald-400 bg-emerald-950/60 h-1.5 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* SECTION 6: Camera Angles & Optics */}
        <div className="space-y-2 pt-2 border-t border-emerald-500/20">
          <div className="text-emerald-400 font-semibold tracking-wider flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" /> CAMERA PRESETS
          </div>

          <div className="grid grid-cols-4 gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => engine?.setCameraView('isometric')}
              className="p-1.5 rounded border border-emerald-500/30 hover:border-emerald-400 bg-black/40 text-center"
            >
              ISO
            </button>
            <button
              type="button"
              onClick={() => engine?.setCameraView('axial')}
              className="p-1.5 rounded border border-emerald-500/30 hover:border-emerald-400 bg-black/40 text-center"
            >
              Top (Z)
            </button>
            <button
              type="button"
              onClick={() => engine?.setCameraView('coronal')}
              className="p-1.5 rounded border border-emerald-500/30 hover:border-emerald-400 bg-black/40 text-center"
            >
              Front (Y)
            </button>
            <button
              type="button"
              onClick={() => engine?.setCameraView('sagittal')}
              className="p-1.5 rounded border border-emerald-500/30 hover:border-emerald-400 bg-black/40 text-center"
            >
              Side (X)
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-gray-300">
              <input
                type="checkbox"
                checked={config.autoRotate}
                onChange={(e) => {
                  onConfigChange({ autoRotate: e.target.checked });
                  engine?.setAutoRotate(e.target.checked);
                }}
                className="accent-emerald-400 rounded"
              />
              <span>Continuous Orbit Rotation</span>
            </label>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-gray-300">
              <input
                type="checkbox"
                checked={config.jitter}
                onChange={(e) => {
                  onConfigChange({ jitter: e.target.checked });
                  engine?.setJitter(e.target.checked);
                }}
                className="accent-emerald-400 rounded"
              />
              <span>Ray Jitter (Anti-Banding)</span>
            </label>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-gray-300">
              <input
                type="checkbox"
                checked={config.invertLuminance}
                onChange={(e) => {
                  onConfigChange({ invertLuminance: e.target.checked });
                  engine?.setInvert(e.target.checked);
                }}
                className="accent-emerald-400 rounded"
              />
              <span>Invert Luminance</span>
            </label>
          </div>
        </div>
      </div>
    </aside>
  );
};
