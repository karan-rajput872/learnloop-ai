import React from 'react';

interface MasteryGaugeProps {
  score: number;
  label?: string;
  size?: number;
}

export const MasteryGauge: React.FC<MasteryGaugeProps> = ({ score, label = "Mastery", size = 160 }) => {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, score)) / 100;
  const strokeDashoffset = circumference * (1 - progress);

  let color = '#5B5CE2'; // Brand indigo
  let level = 'Novice';
  let badgeBg = '#EEF0FD';
  let badgeBorder = '#C7D2FE';
  let badgeText = '#5B5CE2';

  if (score >= 70) {
    color = '#0F9F91'; // Teal
    level = 'Mastered';
    badgeBg = '#E6F7F5';
    badgeBorder = '#99F6E4';
    badgeText = '#0F9F91';
  } else if (score >= 40) {
    color = '#D99027'; // Amber
    level = 'Developing';
    badgeBg = '#FEF7ED';
    badgeBorder = '#FED7AA';
    badgeText = '#D99027';
  }

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E6E9EF"
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
        <span className="text-3xl font-extrabold font-mono text-[#172033] tracking-tight">
          {Math.round(score)}%
        </span>
        <span className="text-[11px] font-mono text-[#667085] uppercase tracking-wider mt-0.5">
          {label}
        </span>
        <span
          className="text-[10px] font-semibold px-2 py-0.5 mt-1 rounded-full border font-mono"
          style={{ color: badgeText, borderColor: badgeBorder, backgroundColor: badgeBg }}
        >
          {level}
        </span>
      </div>
    </div>
  );
};
