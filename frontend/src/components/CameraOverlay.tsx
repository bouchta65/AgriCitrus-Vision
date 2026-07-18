import React from 'react';

interface CameraOverlayProps {
  confidence?: string;
  isCapturing?: boolean;
}

export const CameraOverlay: React.FC<CameraOverlayProps> = ({
  confidence = '88.4%',
  isCapturing = false
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center font-mono">
      {/* 4 Corner camera anchors */}
      <div className="absolute top-10 left-10 w-8 h-8 border-t-2 border-l-2 border-orange-500"></div>
      <div className="absolute top-10 right-10 w-8 h-8 border-t-2 border-r-2 border-orange-500"></div>
      <div className="absolute bottom-10 left-10 w-8 h-8 border-b-2 border-l-2 border-orange-500"></div>
      <div className="absolute bottom-10 right-10 w-8 h-8 border-b-2 border-r-2 border-orange-500"></div>

      {/* Target focal pointer */}
      <div className="relative border-2 border-dashed border-white/20 w-80 h-80 rounded-full flex items-center justify-center">
        <div className="w-4 h-4 border border-orange-500/50 rounded-full"></div>
        
        {/* Dynamic target pill */}
        <div className="absolute -top-6 bg-orange-600 outline outline-orange-400 text-[10px] font-bold text-white px-2.5 py-0.5 rounded-full shadow-md animate-pulse">
          TARGET: CONFIDENCE {confidence}
        </div>
      </div>

      {isCapturing && (
        <div className="absolute inset-0 bg-white/10 backdrop-invert transition-all duration-300"></div>
      )}
    </div>
  );
};
