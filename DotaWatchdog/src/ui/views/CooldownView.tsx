import React from 'react'
import { CountdownRing } from '../components/CountdownRing'
import { useWatchdogStore } from '../store/watchdog-store'

export const CooldownView: React.FC = () => {
  const { ctx, remainingMs, progressPercent, dotaBlockedCount } = useWatchdogStore()
  const totalMin = ctx ? Math.round(ctx.cooldownDurationMs / 60000) : 20

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 gap-8">
      {/* Ring */}
      <CountdownRing progressPercent={progressPercent} remainingMs={remainingMs} size={220} />

      {/* Info */}
      <div className="text-center max-w-sm">
        <p className="text-gray-300 text-sm leading-relaxed">
          启动器已激活，需等待 <span className="text-orange-400 font-semibold">{totalMin} 分钟</span> 冷却期结束后才能解锁 Dota 2。
        </p>
        <p className="text-gray-500 text-xs mt-2">
          冷却期间尝试启动 Dota 2 将被立即终止。
        </p>
      </div>

      {/* Blocked counter */}
      {dotaBlockedCount > 0 && (
        <div className="px-4 py-2 rounded-lg bg-red-900/30 border border-red-800 text-sm text-red-400 font-mono">
          已拦截 {dotaBlockedCount} 次启动尝试
        </div>
      )}

      {/* Motivational note */}
      <div className="px-5 py-3 rounded-lg bg-brand-panel border border-brand-border text-xs text-gray-400 max-w-sm text-center">
        "The best programs are written so that computing machines can perform them quickly and so that human beings can understand them clearly."
        <div className="text-gray-600 mt-1">— Knuth</div>
      </div>
    </div>
  )
}
