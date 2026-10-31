import React from 'react';

interface MasteryGaugeProps {
  score: number;
  label?: string;
  size?: number;
}

export const MasteryGauge: React.FC<MasteryGaugeProps> = ({ score, label = "Mastery", size = 160 }) => {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, score)) / 100;
  const strokeDashoffset = circumference * (1 - progress);

  let color = '#A855F7'; // purple
  let level = 'Novice';

  if (score >= 80) {
    color = '#10B981'; // emerald
    level = 'Mastered';
  } else if (score >= 55) {
    color = '#06B6D4'; // cyan
    level = 'Proficient';
  } else if (score >= 35) {
    color = '#F59E0B'; // amber
    level = 'Developing';
  }

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1E293B"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <span className="text-3xl font-extrabold font-mono text-white">
          {Math.round(score)}%
        </span>
        <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mt-0.5">
          {label}
        </span>
        <span
          className="text-[10px] font-semibold px-2 py-0.5 mt-1 rounded-full border font-mono"
          style={{ color, borderColor: `${color}40`, backgroundColor: `${color}15` }}
        >
          {level}
        </span>
      </div>
    </div>
  );
};
