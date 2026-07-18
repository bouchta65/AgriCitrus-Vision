import React from 'react';

interface CitrusLogoProps {
  className?: string;
  size?: number; // width/height of the SVG icon
  showText?: boolean;
  darkText?: boolean; // toggle dark/light text color
}

export const CitrusLogo: React.FC<CitrusLogoProps> = ({
  className = '',
  size = 36,
  showText = true,
  darkText = true,
}) => {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Cartoon-Vector Orange SVG Graphic */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transform hover:scale-110 active:scale-95 transition-all duration-300 ease-out"
      >
        {/* Definitions for Gradients */}
        <defs>
          <radialGradient
            id="cartoonOrangeGrad"
            cx="35%"
            cy="35%"
            r="65%"
          >
            <stop offset="0%" stopColor="#fff7ed" /> {/* bright radial light spot */}
            <stop offset="15%" stopColor="#fb923c" /> {/* bright orange highlight */}
            <stop offset="70%" stopColor="#ea580c" /> {/* medium orange */}
            <stop offset="100%" stopColor="#c2410c" /> {/* deep rich outer shade */}
          </radialGradient>
          <linearGradient id="cartoonLeafGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#15803d" /> {/* deep forest green base */}
            <stop offset="60%" stopColor="#84cc16" /> {/* vibrant green */}
            <stop offset="100%" stopColor="#bef264" /> {/* bright neon yellow-green tip */}
          </linearGradient>
        </defs>

        {/* 1. Connecting Stem */}
        <path
          d="M 50 29 C 49 23, 52 18, 54 16"
          stroke="#18181b"
          strokeWidth="5.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* 2. Juicy Orange Sphere with Bold Outlines */}
        <circle
          cx="50"
          cy="58"
          r="32"
          fill="url(#cartoonOrangeGrad)"
          stroke="#18181b"
          strokeWidth="5.5"
        />

        {/* 3. Glossy Specular Shine Crescent (Gives the modern shiny badge looks) */}
        <path
          d="M 31 46 C 33 38, 38 33, 44 31"
          stroke="white"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />

        {/* 4. Elegant Green Outlined Leaf */}
        <path
          d="M 54 16 C 40 10, 26 12, 16 18 C 22 27, 39 28, 54 16 Z"
          fill="url(#cartoonLeafGrad)"
          stroke="#18181b"
          strokeWidth="5.5"
          strokeLinejoin="round"
        />

        {/* 5. Delicate Center Vein inside the Leaf */}
        <path
          d="M 18 18 C 29 20, 41 18, 52 16"
          stroke="#18181b"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>

      {/* Modern CitrIA Logo Brand Lettering */}
      {showText && (
        <span
          className={`font-display text-[22px] font-bold lg:text-2xl tracking-tight transition-all duration-300 ${
            darkText ? 'text-stone-900 dark:text-stone-50' : 'text-white'
          }`}
        >
          Citr<span className="text-[#f97316] font-extrabold tracking-tight">IA</span>
        </span>
      )}
    </div>
  );
};
