import React from "react";

interface LifeSaverLogoProps {
  className?: string;
  showText?: boolean;
}

export default function LifeSaverLogo({ className = "h-8 w-8", showText = false }: LifeSaverLogoProps) {
  return (
    <div className={`flex items-center gap-3 select-none ${showText ? "w-auto" : "w-fit"}`}>
      {/* Crisp High-Fidelity SVG Vector Logo */}
      <svg
        viewBox="0 0 500 500"
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Orange Gradient for the Lifering body */}
          <linearGradient id="orangeGrad" x1="100" y1="100" x2="400" y2="400" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FF7A3B" />
            <stop offset="100%" stopColor="#EA3900" />
          </linearGradient>

          {/* Blue Gradient for the Cradling Hand */}
          <linearGradient id="blueGrad" x1="100" y1="300" x2="400" y2="480" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#30AAFF" />
            <stop offset="50%" stopColor="#0B71E1" />
            <stop offset="100%" stopColor="#034FA3" />
          </linearGradient>

          {/* Shadow filters for elegant 3D volume effect */}
          <filter id="softShadow" x="-10%" y="-10%" width="130%" height="130%">
            <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#2D312E" floodOpacity="0.12" />
          </filter>
          
          <filter id="innerDepth" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="2" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.15" />
          </filter>
        </defs>

        {/* 1. White Background Layer for contrast */}
        <circle cx="250" cy="250" r="230" fill="#FFFFFF" />

        {/* 2. THE LIFE RING RING */}
        <g filter="url(#softShadow)">
          {/* Main Orange Ring base */}
          <circle cx="250" cy="210" r="130" stroke="url(#orangeGrad)" strokeWidth="56" fill="transparent" />

          {/* White stripes on Life ring (four segment wraps) */}
          {/* Top-Left wrapper */}
          <path
            d="M 185 145 A 130 130 0 0 1 215 118"
            stroke="#FFFFFF"
            strokeWidth="57"
            fill="transparent"
            strokeLinecap="square"
          />
          {/* Top-Right wrapper */}
          <path
            d="M 285 118 A 130 130 0 0 1 315 145"
            stroke="#FFFFFF"
            strokeWidth="57"
            fill="transparent"
            strokeLinecap="square"
          />
          {/* Bottom-Left wrapper */}
          <path
            d="M 185 275 A 130 130 0 0 0 215 302"
            stroke="#FFFFFF"
            strokeWidth="57"
            fill="transparent"
            strokeLinecap="square"
          />
          {/* Bottom-Right wrapper */}
          <path
            d="M 285 302 A 130 130 0 0 0 315 275"
            stroke="#FFFFFF"
            strokeWidth="57"
            fill="transparent"
            strokeLinecap="square"
          />

          {/* Innermost circle definition */}
          <circle cx="250" cy="210" r="102" stroke="#FAFFAF" strokeWidth="2" strokeDasharray="6 4" strokeOpacity="0.3" fill="transparent" />
        </g>

        {/* 3. THE BLUE CRADLING SUPPORT HAND */}
        {/* Customized high-fidelity curvature of a palm cradling the lifering from underneath */}
        <g filter="url(#softShadow)">
          <path
            d="M 130 210
               C 130 250, 150 320, 250 325
               C 350 330, 420 250, 420 210
               C 420 200, 410 205, 400 215
               C 375 240, 345 255, 310 240
               C 275 225, 290 255, 255 255
               C 220 255, 205 235, 180 240
               C 155 245, 140 220, 130 210 Z"
            fill="url(#blueGrad)"
          />
          {/* Stylized wrist connector sweep */}
          <path
            d="M 130 210
               C 128 300, 200 400, 250 410
               C 300 400, 372 300, 370 210
               C 362 260, 310 330, 250 330
               C 190 330, 138 260, 130 210 Z"
            fill="url(#blueGrad)"
            opacity="0.85"
          />
        </g>
      </svg>

      {showText && (
        <div className="flex flex-col text-left">
          <span className="text-xl font-serif font-black tracking-tight text-[#1C1E1B] leading-none">
            LIFE <span className="text-[#EA3900]">S</span>
            <span className="text-[#0B71E1]">A</span>VER
          </span>
          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#7A827B] mt-1 leading-none">
            WE ARE HERE TO HELP
          </span>
        </div>
      )}
    </div>
  );
}
