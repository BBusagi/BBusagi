import React from 'react'
import { WatchdogState } from '../store/watchdog-store'

interface Props {
  state: WatchdogState
  dotaBlockedCount: number
}

const stateConfig: Record<WatchdogState, { label: string; color: string; dot: string }> = {
  LOCKED:    { label: '锁定中',      color: 'text-red-400',    dot: 'bg-red-500' },
  COOLDOWN:  { label: '冷却中',      color: 'text-orange-400', dot: 'bg-orange-500' },
  CHALLENGE: { label: '算法挑战',    color: 'text-yellow-400', dot: 'bg-yellow-500' },
  FOLLOW_UP: { label: '追加问题',    color: 'text-blue-400',   dot: 'bg-blue-500' },
  UNLOCKED:  { label: '已解锁',      color: 'text-green-400',  dot: 'bg-green-500' },
  SETTINGS:  { label: '设置',        color: 'text-gray-400',   dot: 'bg-gray-500' },
}

export const StatusBanner: React.FC<Props> = ({ state, dotaBlockedCount }) => {
  const cfg = stateConfig[state]

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-brand-panel border-b border-brand-border select-none">
      {/* Drag region (title bar replacement) */}
      <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <div className={`w-2 h-2 rounded-full ${cfg.dot} animate-pulse`} />
        <span className="text-sm font-mono text-gray-300">
          DotaWatchdog
          <span className={`ml-2 ${cfg.color}`}>— {cfg.label}</span>
        </span>
      </div>

      <div className="flex items-center gap-3">
        {dotaBlockedCount > 0 && (
          <span className="text-xs text-red-400 font-mono">
            拦截 {dotaBlockedCount} 次
          </span>
        )}
        {/* Window controls */}
        <div className="flex gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button
            onClick={() => window.history.back()}
            className="w-3 h-3 rounded-full bg-gray-600 hover:bg-gray-400 transition-colors"
            title="最小化"
          />
        </div>
      </div>
    </div>
  )
}
