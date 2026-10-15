'use client';

import React from 'react';
import { BookOpen } from 'lucide-react';

interface LogoProps {
  width?: number;
  height?: number;
  showText?: boolean;
  className?: string;
  theme?: 'light' | 'dark' | 'auto';
}

export function Logo({
  width = 36,
  height = 36,
  showText = true,
  className = '',
}: LogoProps) {
  const [imgError, setImgError] = React.useState(false);

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Mol5saty Brand Emblem: Glowing Emerald Leaf growing from a structured dark grid */}
      <div 
        className="rounded-xl overflow-hidden p-0.5 bg-gradient-to-br from-[#22c55e] via-[#059669] to-[#bf7c1c] shadow-md shadow-emerald-500/20 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        <div className="w-full h-full rounded-[10px] bg-[#09090b] flex items-center justify-center relative overflow-hidden border border-emerald-500/20">
          {!imgError ? (
            <img 
              src="/icon.svg" 
              alt="Mol5saty" 
              className="w-full h-full object-contain p-0.5 rounded-[9px]"
              onError={() => setImgError(true)}
            />
          ) : (
            <svg 
              viewBox="0 0 36 36" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full p-1"
            >
              <defs>
                <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#064e3b" />
                </linearGradient>
                <linearGradient id="amberGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#bf7c1c" />
                </linearGradient>
              </defs>
              {/* Structured Grid base */}
              <line x1="6" y1="26" x2="30" y2="26" stroke="#27272a" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="6" y1="30" x2="30" y2="30" stroke="#27272a" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="12" y1="24" x2="12" y2="32" stroke="#27272a" strokeWidth="1.5" />
              <line x1="18" y1="24" x2="18" y2="32" stroke="#27272a" strokeWidth="1.5" />
              <line x1="24" y1="24" x2="24" y2="32" stroke="#27272a" strokeWidth="1.5" />
              
              {/* Glowing Emerald Leaf */}
              <path 
                d="M18 5 C24 8 29 14 27 23 C22 25 15 24 11 20 C10 13 13 8 18 5 Z" 
                fill="url(#leafGrad)" 
              />
              <path 
                d="M18 7 C18 14 17 21 13 23" 
                stroke="#4ade80" 
                strokeWidth="1.2" 
                strokeLinecap="round" 
              />
              {/* Warm Amber starlight droplet highlight */}
              <circle cx="23" cy="11" r="2" fill="url(#amberGlow)" />
            </svg>
          )}
        </div>
      </div>

      {showText && (
        <div className="flex flex-col leading-none text-left">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white font-sans transition-colors">
              ملخصاتي
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 uppercase tracking-widest hidden sm:inline-block">
              UNI
            </span>
          </div>
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 font-mono tracking-wider transition-colors">
            MOL5SATY
          </span>
        </div>
      )}
    </div>
  );
}
