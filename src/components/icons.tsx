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
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Mola5saty Emblem: Glowing Deep Navy / Blue Gradient with Open Academic Book */}
      <div 
        className="rounded-xl bg-gradient-to-br from-[#2563eb] to-[#1e3a8a] p-0.5 shadow-md shadow-blue-500/25 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        <div className="w-full h-full rounded-[10px] bg-slate-900/90 flex items-center justify-center border border-white/10">
          <BookOpen 
            className="text-white drop-shadow-xs" 
            style={{ width: `${Math.round(width * 0.52)}px`, height: `${Math.round(height * 0.52)}px` }} 
          />
        </div>
      </div>

      {showText && (
        <div className="flex flex-col leading-none text-left">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white font-sans transition-colors">
              ملخصاتي
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-500/30 uppercase tracking-widest hidden sm:inline-block">
              UNI
            </span>
          </div>
          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 font-mono tracking-wider transition-colors">
            MOLA5SATY
          </span>
        </div>
      )}
    </div>
  );
}
