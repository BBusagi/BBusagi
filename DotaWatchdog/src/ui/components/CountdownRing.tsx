import React from 'react'

interface Props {
  progressPercent: number
  remainingMs: number
  size?: number
}

function formatTime(ms: number): string {
  const totalSec = Math.ceil(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export const CountdownRing: React.FC<Props> = ({ progressPercent, remainingMs, size = 200 }) => {
  const r = (size - 20) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - progressPercent / 100)

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#0f3460"
          strokeWidth={10}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={progressPercent >= 100 ? '#27ae60' : '#e67e22'}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-mono font-bold text-white">
          {progressPercent >= 100 ? '00:00' : formatTime(remainingMs)}
        </span>
        <span className="text-xs text-gray-400 mt-1">冷却中</span>
      </div>
    </div>
  )
}
