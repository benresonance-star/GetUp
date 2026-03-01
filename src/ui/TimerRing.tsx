'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface TimerRingProps {
  totalMinutes: number;
  elapsedSeconds: number;
  phases: {
    warmupMin: number;
    mainMin: number;
    cooldownMin: number;
  };
  size?: number;
  strokeWidth?: number;
}

export const TimerRing: React.FC<TimerRingProps> = ({
  totalMinutes,
  elapsedSeconds,
  phases,
  size = 300,
  strokeWidth = 12,
}) => {
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  
  const totalSeconds = totalMinutes * 60;
  const progress = Math.min(elapsedSeconds / totalSeconds, 1);
  
  const dashCount = totalMinutes;
  const dashGap = 2; // gap in pixels between dashes
  const dashLength = (circumference / dashCount) - dashGap;

  const phaseColors = {
    warmup: '#d97706', // amber-600
    main: '#4f46e5',   // indigo-600
    cooldown: '#16a34a', // green-600
    inactive: '#374151', // gray-700
  };

  const dashes = useMemo(() => {
    const items = [];
    let currentMinute = 0;

    for (let i = 0; i < dashCount; i++) {
      let color = phaseColors.inactive;
      const minuteAtDash = i;
      
      if (minuteAtDash < phases.warmupMin) {
        color = phaseColors.warmup;
      } else if (minuteAtDash < phases.warmupMin + phases.mainMin) {
        color = phaseColors.main;
      } else {
        color = phaseColors.cooldown;
      }

      const isElapsed = (i + 1) * 60 <= elapsedSeconds;
      const opacity = isElapsed ? 1 : 0.3;

      items.push({
        index: i,
        color,
        opacity,
      });
    }
    return items;
  }, [dashCount, phases, elapsedSeconds]);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        {dashes.map((dash) => (
          <circle
            key={dash.index}
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke={dash.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dashLength} ${circumference - dashLength}`}
            strokeDashoffset={-dash.index * (dashLength + dashGap)}
            strokeLinecap="round"
            style={{ opacity: dash.opacity, transition: 'opacity 0.3s ease, stroke 0.3s ease' }}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <span className="text-5xl font-bold tracking-tighter">
          {formatTime(Math.max(totalSeconds - elapsedSeconds, 0))}
        </span>
        <span className="text-sm uppercase tracking-widest text-gray-400 mt-1">Remaining</span>
      </div>
    </div>
  );
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
