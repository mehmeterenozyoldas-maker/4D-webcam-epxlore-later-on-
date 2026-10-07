import React, { useEffect, useRef } from 'react';
import { Layers } from 'lucide-react';
import { RaymarchingEngine } from '../engine/raymarchingEngine';

interface OrthoSliceViewsProps {
  engine: RaymarchingEngine | null;
  tintColor: string;
}

export const OrthoSliceViews: React.FC<OrthoSliceViewsProps> = ({ engine, tintColor }) => {
  const axialCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const coronalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sagittalCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animId: number;
    let frameCounter = 0;

    const renderSlices = () => {
      frameCounter++;
      // Render every 4 frames (15fps) to maintain high GPU rendering performance for the main raymarcher
      if (frameCounter % 4 === 0 && engine) {
        const slices = engine.getOrthoSlices();

        if (slices.axial && axialCanvasRef.current) {
          const cvs = axialCanvasRef.current;
          if (cvs.width !== slices.axial.width || cvs.height !== slices.axial.height) {
            cvs.width = slices.axial.width;
            cvs.height = slices.axial.height;
          }
          const ctx = cvs.getContext('2d');
          if (ctx) ctx.putImageData(slices.axial, 0, 0);
        }

        if (slices.coronal && coronalCanvasRef.current) {
          const cvs = coronalCanvasRef.current;
          if (cvs.width !== slices.coronal.width || cvs.height !== slices.coronal.height) {
            cvs.width = slices.coronal.width;
            cvs.height = slices.coronal.height;
          }
          const ctx = cvs.getContext('2d');
          if (ctx) ctx.putImageData(slices.coronal, 0, 0);
        }

        if (slices.sagittal && sagittalCanvasRef.current) {
          const cvs = sagittalCanvasRef.current;
          if (cvs.width !== slices.sagittal.width || cvs.height !== slices.sagittal.height) {
            cvs.width = slices.sagittal.width;
            cvs.height = slices.sagittal.height;
          }
          const ctx = cvs.getContext('2d');
          if (ctx) ctx.putImageData(slices.sagittal, 0, 0);
        }
      }
      animId = requestAnimationFrame(renderSlices);
    };

    animId = requestAnimationFrame(renderSlices);
    return () => cancelAnimationFrame(animId);
  }, [engine]);

  return (
    <div className="bg-black/75 backdrop-blur-md border border-emerald-500/30 rounded-lg p-3 text-xs font-mono shadow-[0_0_20px_rgba(0,255,153,0.15)] flex flex-col gap-2">
      <div className="flex items-center justify-between border-b border-emerald-500/20 pb-1.5 text-emerald-400">
        <div className="flex items-center gap-1.5 font-bold tracking-wider">
          <Layers className="w-3.5 h-3.5" />
          <span>ORTHO MULTI-PLANAR SLICING</span>
        </div>
        <span className="text-[10px] text-emerald-500/70">MPR 256³</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {/* Axial */}
        <div className="flex flex-col items-center">
          <div className="relative w-24 h-24 bg-black/90 border border-emerald-500/30 rounded overflow-hidden flex items-center justify-center">
            <canvas ref={axialCanvasRef} className="w-full h-full object-contain filter contrast-125" />
            <div className="absolute top-1 left-1 bg-black/80 text-[9px] px-1 rounded text-emerald-300 font-bold border border-emerald-500/40">
              AXIAL (Z)
            </div>
            {/* Crosshair indicator */}
            <div className="absolute inset-0 pointer-events-none opacity-20 border-t border-b border-emerald-400/50 my-auto h-0" />
            <div className="absolute inset-0 pointer-events-none opacity-20 border-l border-r border-emerald-400/50 mx-auto w-0" />
          </div>
          <span className="text-[10px] text-gray-400 mt-0.5">Top-Down</span>
        </div>

        {/* Coronal */}
        <div className="flex flex-col items-center">
          <div className="relative w-24 h-24 bg-black/90 border border-emerald-500/30 rounded overflow-hidden flex items-center justify-center">
            <canvas ref={coronalCanvasRef} className="w-full h-full object-contain filter contrast-125" />
            <div className="absolute top-1 left-1 bg-black/80 text-[9px] px-1 rounded text-emerald-300 font-bold border border-emerald-500/40">
              CORONAL (Y)
            </div>
            <div className="absolute inset-0 pointer-events-none opacity-20 border-t border-b border-emerald-400/50 my-auto h-0" />
            <div className="absolute inset-0 pointer-events-none opacity-20 border-l border-r border-emerald-400/50 mx-auto w-0" />
          </div>
          <span className="text-[10px] text-gray-400 mt-0.5">Front View</span>
        </div>

        {/* Sagittal */}
        <div className="flex flex-col items-center">
          <div className="relative w-24 h-24 bg-black/90 border border-emerald-500/30 rounded overflow-hidden flex items-center justify-center">
            <canvas ref={sagittalCanvasRef} className="w-full h-full object-contain filter contrast-125" />
            <div className="absolute top-1 left-1 bg-black/80 text-[9px] px-1 rounded text-emerald-300 font-bold border border-emerald-500/40">
              SAGITTAL (X)
            </div>
            <div className="absolute inset-0 pointer-events-none opacity-20 border-t border-b border-emerald-400/50 my-auto h-0" />
            <div className="absolute inset-0 pointer-events-none opacity-20 border-l border-r border-emerald-400/50 mx-auto w-0" />
          </div>
          <span className="text-[10px] text-gray-400 mt-0.5">Profile</span>
        </div>
      </div>
    </div>
  );
};
