import React from 'react';

export type ThreeDIconType =
  | '3d-calculator'
  | '3d-check'
  | '3d-cross'
  | '3d-sparkles'
  | '3d-trophy'
  | '3d-lock'
  | '3d-pencil'
  | '3d-bulb'
  | '3d-star'
  | '3d-flag'
  | '3d-target'
  | '3d-sound';

interface ThreeDIconProps {
  type: ThreeDIconType;
  size?: number;
  className?: string;
  stepNumber?: number | string;
}

export const ThreeDIcon: React.FC<ThreeDIconProps> = ({
  type,
  size = 40,
  className = '',
  stepNumber,
}) => {
  const width = size;
  const height = size;

  switch (type) {
    case '3d-calculator':
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 drop-shadow-md select-none ${className}`}
        >
          <defs>
            <linearGradient id="calcBody" x1="12" y1="6" x2="52" y2="58" gradientUnits="userSpaceOnUse">
              <stop stopColor="#1E293B" />
              <stop offset="0.5" stopColor="#0F172A" />
              <stop offset="1" stopColor="#020617" />
            </linearGradient>
            <linearGradient id="calcBevel" x1="10" y1="4" x2="54" y2="60" gradientUnits="userSpaceOnUse">
              <stop stopColor="#475569" />
              <stop offset="1" stopColor="#0F172A" />
            </linearGradient>
            <linearGradient id="calcScreen" x1="16" y1="12" x2="48" y2="24" gradientUnits="userSpaceOnUse">
              <stop stopColor="#047857" />
              <stop offset="0.6" stopColor="#065F46" />
              <stop offset="1" stopColor="#064E3B" />
            </linearGradient>
            <linearGradient id="calcKeyTop" x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#38BDF8" />
              <stop offset="1" stopColor="#0284C7" />
            </linearGradient>
            <linearGradient id="calcKeyAccent" x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#F59E0B" />
              <stop offset="1" stopColor="#D97706" />
            </linearGradient>
            <linearGradient id="calcKeyNum" x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#475569" />
              <stop offset="1" stopColor="#334155" />
            </linearGradient>
            <filter id="keyGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="1" floodColor="#000" floodOpacity="0.4" />
            </filter>
          </defs>
          {/* Main 3D Bevel Rim */}
          <rect x="8" y="4" width="48" height="56" rx="12" fill="url(#calcBevel)" />
          {/* Body Inner Plate */}
          <rect x="9.5" y="5.5" width="45" height="53" rx="10.5" fill="url(#calcBody)" />
          {/* Glass Top Highlight */}
          <path d="M12 8C12 6.89543 12.8954 6 14 6H50C51.1046 6 52 6.89543 52 8V16L12 22V8Z" fill="white" fillOpacity="0.08" />
          
          {/* LCD Screen with 3D inset */}
          <rect x="14" y="11" width="36" height="13" rx="4" fill="#022C22" stroke="#10B981" strokeWidth="0.8" strokeOpacity="0.4" />
          <rect x="15" y="12" width="34" height="11" rx="3" fill="url(#calcScreen)" />
          {/* LCD Content Display */}
          <text x="45" y="20.5" fill="#A7F3D0" fontSize="8" fontFamily="monospace" fontWeight="bold" textAnchor="end">
            f(x)=dy/dx
          </text>
          
          {/* Keys Grid with 3D bevels */}
          {/* Row 1: Function Keys */}
          <rect x="14" y="28" width="9" height="6.5" rx="2" fill="url(#calcKeyAccent)" filter="url(#keyGlow)" />
          <text x="18.5" y="33" fill="#FFF" fontSize="5" fontWeight="bold" textAnchor="middle">∫</text>
          
          <rect x="25" y="28" width="9" height="6.5" rx="2" fill="url(#calcKeyTop)" filter="url(#keyGlow)" />
          <text x="29.5" y="33" fill="#FFF" fontSize="5" fontWeight="bold" textAnchor="middle">x²</text>
          
          <rect x="36" y="28" width="14" height="6.5" rx="2" fill="url(#calcKeyAccent)" filter="url(#keyGlow)" />
          <text x="43" y="33" fill="#FFF" fontSize="4.5" fontWeight="bold" textAnchor="middle">AC</text>

          {/* Row 2: Numbers */}
          <rect x="14" y="37" width="9" height="6.5" rx="2" fill="url(#calcKeyNum)" filter="url(#keyGlow)" />
          <text x="18.5" y="42" fill="#F8FAFC" fontSize="5" fontWeight="bold" textAnchor="middle">7</text>
          
          <rect x="25" y="37" width="9" height="6.5" rx="2" fill="url(#calcKeyNum)" filter="url(#keyGlow)" />
          <text x="29.5" y="42" fill="#F8FAFC" fontSize="5" fontWeight="bold" textAnchor="middle">8</text>
          
          <rect x="36" y="37" width="9" height="6.5" rx="2" fill="url(#calcKeyNum)" filter="url(#keyGlow)" />
          <text x="40.5" y="42" fill="#F8FAFC" fontSize="5" fontWeight="bold" textAnchor="middle">9</text>

          {/* Row 3 */}
          <rect x="14" y="46" width="9" height="6.5" rx="2" fill="url(#calcKeyNum)" filter="url(#keyGlow)" />
          <text x="18.5" y="51" fill="#F8FAFC" fontSize="5" fontWeight="bold" textAnchor="middle">4</text>
          
          <rect x="25" y="46" width="9" height="6.5" rx="2" fill="url(#calcKeyNum)" filter="url(#keyGlow)" />
          <text x="29.5" y="51" fill="#F8FAFC" fontSize="5" fontWeight="bold" textAnchor="middle">5</text>
          
          <rect x="36" y="46" width="14" height="6.5" rx="2" fill="#10B981" filter="url(#keyGlow)" />
          <text x="43" y="51.5" fill="#FFF" fontSize="6" fontWeight="bold" textAnchor="middle">=</text>
        </svg>
      );

    case '3d-check':
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 drop-shadow-md select-none ${className}`}
        >
          <defs>
            <radialGradient id="checkGlow" cx="30%" cy="25%" r="75%">
              <stop stopColor="#34D399" />
              <stop offset="0.45" stopColor="#10B981" />
              <stop offset="0.85" stopColor="#059669" />
              <stop offset="1" stopColor="#047857" />
            </radialGradient>
            <linearGradient id="checkRim" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6EE7B7" />
              <stop offset="1" stopColor="#065F46" />
            </linearGradient>
            <filter id="checkShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#064E3B" floodOpacity="0.4" />
            </filter>
          </defs>
          {/* Metallic Rim */}
          <circle cx="32" cy="32" r="28" fill="url(#checkRim)" />
          {/* Sphere Body */}
          <circle cx="32" cy="32" r="25" fill="url(#checkGlow)" />
          {/* Specular Highlight Arc */}
          <ellipse cx="27" cy="18" rx="14" ry="7" fill="white" fillOpacity="0.32" transform="rotate(-15 27 18)" />
          {/* 3D Check Glyph */}
          <path
            d="M20 32.5L28 40.5L44 24"
            stroke="white"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#checkShadow)"
          />
        </svg>
      );

    case '3d-cross':
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 drop-shadow-md select-none ${className}`}
        >
          <defs>
            <radialGradient id="crossGlow" cx="30%" cy="25%" r="75%">
              <stop stopColor="#FB7185" />
              <stop offset="0.45" stopColor="#F43F5E" />
              <stop offset="0.85" stopColor="#E11D48" />
              <stop offset="1" stopColor="#9F1239" />
            </radialGradient>
            <linearGradient id="crossRim" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FDA4AF" />
              <stop offset="1" stopColor="#881337" />
            </linearGradient>
            <filter id="crossShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#4C0519" floodOpacity="0.45" />
            </filter>
          </defs>
          {/* Rim */}
          <circle cx="32" cy="32" r="28" fill="url(#crossRim)" />
          {/* Sphere Body */}
          <circle cx="32" cy="32" r="25" fill="url(#crossGlow)" />
          {/* Top Glass Highlight */}
          <ellipse cx="27" cy="18" rx="14" ry="7" fill="white" fillOpacity="0.3" transform="rotate(-15 27 18)" />
          {/* 3D Cross Glyph */}
          <path
            d="M23 23L41 41M41 23L23 41"
            stroke="white"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#crossShadow)"
          />
        </svg>
      );

    case '3d-sparkles':
    case '3d-trophy':
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 drop-shadow-md select-none ${className}`}
        >
          <defs>
            <linearGradient id="goldCup" x1="16" y1="8" x2="48" y2="44" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FDE047" />
              <stop offset="0.4" stopColor="#F59E0B" />
              <stop offset="0.85" stopColor="#D97706" />
              <stop offset="1" stopColor="#B45309" />
            </linearGradient>
            <linearGradient id="goldRim" x1="12" y1="6" x2="52" y2="6" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FEF08A" />
              <stop offset="0.5" stopColor="#FDE047" />
              <stop offset="1" stopColor="#D97706" />
            </linearGradient>
            <filter id="goldShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#78350F" floodOpacity="0.4" />
            </filter>
          </defs>
          {/* Left Handle */}
          <path d="M18 16C10 16 8 26 18 30" stroke="#D97706" strokeWidth="3.5" strokeLinecap="round" />
          {/* Right Handle */}
          <path d="M46 16C54 16 56 26 46 30" stroke="#D97706" strokeWidth="3.5" strokeLinecap="round" />
          {/* Trophy Cup Body */}
          <path d="M16 10H48V24C48 33 40 40 32 40C24 40 16 33 16 24V10Z" fill="url(#goldCup)" filter="url(#goldShadow)" />
          {/* Top Rim */}
          <ellipse cx="32" cy="10" rx="16" ry="3.5" fill="url(#goldRim)" />
          {/* Stem & Base */}
          <rect x="29" y="39" width="6" height="9" fill="#D97706" />
          <rect x="20" y="47" width="24" height="6" rx="2" fill="#B45309" />
          <rect x="18" y="52" width="28" height="5" rx="2" fill="#78350F" />
          {/* Star Badge on Trophy */}
          <path d="M32 17L33.8 21.5L38.5 22L35 25.2L36 30L32 27.5L28 30L29 25.2L25.5 22L30.2 21.5L32 17Z" fill="#FFF" fillOpacity="0.85" />
        </svg>
      );

    case '3d-lock':
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 drop-shadow-md select-none ${className}`}
        >
          <defs>
            <linearGradient id="lockShackle" x1="20" y1="8" x2="44" y2="8" gradientUnits="userSpaceOnUse">
              <stop stopColor="#CBD5E1" />
              <stop offset="0.5" stopColor="#E2E8F0" />
              <stop offset="1" stopColor="#94A3B8" />
            </linearGradient>
            <linearGradient id="lockBody" x1="14" y1="26" x2="50" y2="58" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F59E0B" />
              <stop offset="0.5" stopColor="#D97706" />
              <stop offset="1" stopColor="#B45309" />
            </linearGradient>
          </defs>
          {/* Metallic Shackle */}
          <path d="M22 28V18C22 12.4772 26.4772 8 32 8C37.5228 8 42 12.4772 42 18V28" stroke="url(#lockShackle)" strokeWidth="6" strokeLinecap="round" />
          {/* Padlock Body */}
          <rect x="15" y="27" width="34" height="28" rx="7" fill="url(#lockBody)" />
          {/* Glass Top Rim */}
          <path d="M19 30C19 28.3431 20.3431 27 22 27H42C43.6569 27 45 28.3431 45 30V34H19V30Z" fill="white" fillOpacity="0.2" />
          {/* Keyhole */}
          <circle cx="32" cy="39" r="3.5" fill="#451A03" />
          <path d="M30.5 39H33.5L34.5 47H29.5L30.5 39Z" fill="#451A03" />
        </svg>
      );

    case '3d-pencil':
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 drop-shadow-md select-none ${className}`}
        >
          <defs>
            <linearGradient id="pencilWood" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#FBBF24" />
              <stop offset="0.5" stopColor="#F59E0B" />
              <stop offset="1" stopColor="#D97706" />
            </linearGradient>
            <linearGradient id="padBase" x1="12" y1="10" x2="52" y2="54" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F8FAFC" />
              <stop offset="1" stopColor="#E2E8F0" />
            </linearGradient>
          </defs>
          {/* Notepad Base */}
          <rect x="10" y="8" width="44" height="50" rx="6" fill="url(#padBase)" stroke="#CBD5E1" strokeWidth="1.5" />
          {/* Top Binding */}
          <rect x="10" y="8" width="44" height="10" rx="3" fill="#0EA5E9" />
          {/* Ruled Math Lines */}
          <line x1="16" y1="26" x2="48" y2="26" stroke="#94A3B8" strokeWidth="1.2" strokeDasharray="3 2" />
          <line x1="16" y1="34" x2="48" y2="34" stroke="#94A3B8" strokeWidth="1.2" strokeDasharray="3 2" />
          <line x1="16" y1="42" x2="48" y2="42" stroke="#94A3B8" strokeWidth="1.2" strokeDasharray="3 2" />
          <line x1="16" y1="50" x2="36" y2="50" stroke="#94A3B8" strokeWidth="1.2" strokeDasharray="3 2" />
          {/* 3D Diagonal Stylus/Pencil */}
          <g transform="translate(32, 24) rotate(42)">
            <rect x="-3" y="-18" width="6" height="24" rx="1.5" fill="url(#pencilWood)" />
            <polygon points="-3,6 3,6 0,14" fill="#FDE68A" />
            <polygon points="-1,11 1,11 0,14" fill="#1E293B" />
            <rect x="-3" y="-22" width="6" height="5" rx="1" fill="#F43F5E" />
          </g>
        </svg>
      );

    case '3d-bulb':
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 drop-shadow-md select-none ${className}`}
        >
          <defs>
            <radialGradient id="bulbGlow" cx="50%" cy="38%" r="55%">
              <stop stopColor="#FEF08A" />
              <stop offset="0.5" stopColor="#FBBF24" />
              <stop offset="0.9" stopColor="#F59E0B" />
              <stop offset="1" stopColor="#D97706" />
            </radialGradient>
          </defs>
          {/* Rays */}
          <line x1="32" y1="4" x2="32" y2="10" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="12" y1="18" x2="17" y2="22" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="52" y1="18" x2="47" y2="22" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" />
          {/* Bulb Body */}
          <path
            d="M32 12C22 12 15 19.5 15 28.5C15 34 18 38 22 43V48H42V43C46 38 49 34 49 28.5C49 19.5 42 12 32 12Z"
            fill="url(#bulbGlow)"
          />
          {/* Highlight */}
          <ellipse cx="26" cy="22" rx="7" ry="4" fill="white" fillOpacity="0.45" transform="rotate(-25 26 22)" />
          {/* Base */}
          <rect x="25" y="48" width="14" height="3" rx="1.5" fill="#94A3B8" />
          <rect x="26" y="52" width="12" height="3" rx="1.5" fill="#64748B" />
          <path d="M28 55H36C36 57.5 34.5 59 32 59C29.5 59 28 57.5 28 55Z" fill="#334155" />
        </svg>
      );

    case '3d-flag':
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 drop-shadow-md select-none ${className}`}
        >
          <defs>
            <linearGradient id="flagGrad" x1="18" y1="6" x2="46" y2="56" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F59E0B" />
              <stop offset="0.5" stopColor="#D97706" />
              <stop offset="1" stopColor="#B45309" />
            </linearGradient>
          </defs>
          <path
            d="M16 6H48C49.1 6 50 6.9 50 8V56L32 44L14 56V8C14 6.9 14.9 6 16 6Z"
            fill="url(#flagGrad)"
          />
          <path d="M14 8C14 6.9 14.9 6 16 6H48C49.1 6 50 6.9 50 8V14L14 18V8Z" fill="white" fillOpacity="0.25" />
          <path d="M32 20L34 25H39L35 28L36.5 33L32 30L27.5 33L29 28L25 25H30L32 20Z" fill="white" fillOpacity="0.9" />
        </svg>
      );

    case '3d-sound':
      return (
        <svg
          width={width}
          height={height}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 drop-shadow-md select-none ${className}`}
        >
          <defs>
            <linearGradient id="spkBody" x1="8" y1="20" x2="34" y2="44" gradientUnits="userSpaceOnUse">
              <stop stopColor="#38BDF8" />
              <stop offset="0.5" stopColor="#0284C7" />
              <stop offset="1" stopColor="#0369A1" />
            </linearGradient>
          </defs>
          {/* Speaker cone */}
          <path
            d="M12 24H20L32 14V50L20 40H12C10.9 40 10 39.1 10 38V26C10 24.9 10.9 24 12 24Z"
            fill="url(#spkBody)"
          />
          {/* Sound waves */}
          <path d="M38 24C41 27 41 37 38 40" stroke="#0284C7" strokeWidth="3" strokeLinecap="round" />
          <path d="M45 18C50 23 50 41 45 46" stroke="#38BDF8" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M52 12C60 19 60 45 52 52" stroke="#7DD3FC" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );

    default:
      return null;
  }
};
