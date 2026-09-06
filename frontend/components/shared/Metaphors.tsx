import React from 'react';
import { Rocket, Mail, Lock } from 'lucide-react';

// FlaskGauge (Traffic-Light Flask) — Paper aesthetic
export const FlaskGauge: React.FC<{ actual: number; target: number; metricName: string; unit: string }> = ({
  actual, target, metricName, unit
}) => {
  const ratio = Math.min(Math.max(actual / target, 0), 1.3);
  const fillHeight = Math.min(ratio * 100, 100);

  let colorClass = 'fill-[#1E9E5A] stroke-[#14532D]';
  if (ratio < 0.7) colorClass = 'fill-[#C81E4A] stroke-[#831843]';
  else if (ratio < 1.0) colorClass = 'fill-[#B8860B] stroke-[#713F12]';

  return (
    <div className="flex flex-col items-center bg-[#F8F6F1] p-4 rounded-lg border border-[#E8E2D5]">
      <div className="relative w-20 h-28 flex justify-center items-end pb-2">
        <svg viewBox="0 0 100 140" className="w-full h-full">
          {/* Flask Outer Outline */}
          <path
            d="M 35 10 L 65 10 L 65 35 L 85 110 A 15 15 0 0 1 70 130 L 30 130 A 15 15 0 0 1 15 110 L 35 35 Z"
            fill="none"
            stroke="#1A1A1A"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          {/* Liquid Fill */}
          <mask id={`flask-mask-${metricName}`}>
            <path d="M 35 10 L 65 10 L 65 35 L 85 110 A 15 15 0 0 1 70 130 L 30 130 A 15 15 0 0 1 15 110 L 35 35 Z" fill="#fff" />
          </mask>
          <rect
            x="0"
            y={140 - (fillHeight * 1.1)}
            width="100"
            height="140"
            className={colorClass}
            mask={`url(#flask-mask-${metricName})`}
            opacity="0.85"
          />
          {/* Flask Measurement Marks */}
          <line x1="30" y1="90" x2="45" y2="90" stroke="#1A1A1A" strokeWidth="2" />
          <line x1="32" y1="65" x2="47" y2="65" stroke="#1A1A1A" strokeWidth="2" />
          <line x1="35" y1="40" x2="50" y2="40" stroke="#1A1A1A" strokeWidth="2" />
        </svg>
      </div>
      <div className="mt-2 text-center">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B6560]">{metricName}</span>
        <div className="text-lg font-bold text-[#1A1A1A]">{actual} / {target} {unit}</div>
        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-[#EAF7ED] text-[#1E9E5A] border border-[#B8E6C4] uppercase mt-1">
          {Math.round((actual / target) * 100)}% Target Achieved
        </span>
      </div>
    </div>
  );
};

// TwoFacedScale — QCBS Technical (70%) vs Commercial (30%) Balance Scale
export const TwoFacedScale: React.FC<{ techScore: number; commScore: number; finalScore: number }> = ({
  techScore, commScore, finalScore
}) => {
  const techWeighted = techScore * 0.7;
  const commWeighted = commScore * 0.3;
  const tilt = Math.max(Math.min((commWeighted - techWeighted) * 0.4, 15), -15);

  return (
    <div className="bg-[#F8F6F1] p-5 rounded-lg border border-[#E8E2D5] flex flex-col items-center">
      <div className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A] mb-2">
        QCBS Technical (70%) vs Commercial (30%) Scale
      </div>

      <div className="relative w-64 h-36 flex flex-col items-center justify-start pt-2">
        {/* Fulcrum Stand */}
        <div className="absolute bottom-2 w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-b-[36px] border-b-[#1A1A1A]" />

        {/* Balance Beam */}
        <div
          className="w-56 h-2.5 bg-[#1A1A1A] rounded-full relative transition-transform duration-700 ease-out origin-center"
          style={{ transform: `rotate(${tilt}deg)` }}
        >
          {/* Left Pan (Technical 70%) */}
          <div className="absolute -left-2 top-2.5 flex flex-col items-center">
            <div className="w-0.5 h-14 bg-[#6B6560]" />
            <div className="w-20 h-9 bg-[#2563EB] border border-[#1E3A8A] rounded-b-xl flex items-center justify-center text-white font-bold text-xs shadow-sm">
              {techScore} PTS
            </div>
            <span className="text-[10px] font-bold uppercase mt-1 text-[#6B6560]">Tech (70%)</span>
          </div>

          {/* Right Pan (Commercial 30%) */}
          <div className="absolute -right-2 top-2.5 flex flex-col items-center">
            <div className="w-0.5 h-14 bg-[#6B6560]" />
            <div className="w-20 h-9 bg-[#B8860B] border border-[#713F12] rounded-b-xl flex items-center justify-center text-white font-bold text-xs shadow-sm">
              {commScore} PTS
            </div>
            <span className="text-[10px] font-bold uppercase mt-1 text-[#6B6560]">Comm (30%)</span>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center bg-white px-4 py-2.5 rounded-lg border border-[#E8E2D5] w-full">
        <span className="text-xs text-[#6B6560] font-bold uppercase">Final QCBS Score: </span>
        <span className="text-lg font-bold text-[#1A1A1A]">{finalScore} / 100</span>
      </div>
    </div>
  );
};

// OrigamiRocket — Resubmission Metaphor
export const OrigamiRocket: React.FC = () => (
  <div className="flex items-center gap-3 bg-[#EAF7ED] border border-[#B8E6C4] p-3.5 rounded-lg">
    <div className="w-9 h-9 bg-[#1E9E5A] rounded-lg flex items-center justify-center">
      <Rocket className="w-5 h-5 text-white" />
    </div>
    <div>
      <div className="text-xs font-bold uppercase text-[#14532D]">Clarification Requested</div>
      <div className="text-xs text-[#1E9E5A]">Submit revised documents to launch back into review pipeline.</div>
    </div>
  </div>
);

// Stamp & Seal Animations
export const StampAnimation: React.FC<{ label: string }> = ({ label }) => (
  <div className="relative inline-block border-2 border-[#1E9E5A] text-[#1E9E5A] font-bold text-xs uppercase px-3 py-1 rounded tracking-widest rotate-[-4deg] bg-[#EAF7ED]">
    ✓ {label}
  </div>
);

export const WinkingEnvelope: React.FC<{ unlocked: boolean }> = ({ unlocked }) => (
  <div className={`p-3.5 rounded-lg border flex items-center gap-3 ${unlocked ? 'bg-[#EAF7ED] text-[#14532D] border-[#B8E6C4]' : 'bg-[#F8F6F1] border-[#E8E2D5] text-[#6B6560]'}`}>
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${unlocked ? 'bg-[#1E9E5A]' : 'bg-[#E8E2D5]'}`}>
      {unlocked ? <Mail className="w-4 h-4 text-white" /> : <Lock className="w-4 h-4 text-[#6B6560]" />}
    </div>
    <div>
      <div className={`text-xs font-bold uppercase ${unlocked ? 'text-[#14532D]' : 'text-[#1A1A1A]'}`}>{unlocked ? 'Commercial Envelopes Unlocked' : 'Commercial Envelopes Sealed'}</div>
      <div className="text-[11px] font-medium opacity-80">
        {unlocked ? 'Financial bids opened following technical qualification.' : 'Financial proposals remain locked until scoring completes.'}
      </div>
    </div>
  </div>
);
