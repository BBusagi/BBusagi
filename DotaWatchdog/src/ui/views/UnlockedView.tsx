import React from 'react'
import { useWatchdogStore } from '../store/watchdog-store'

export const UnlockedView: React.FC = () => {
  const { ctx } = useWatchdogStore()

  const handleRelock = async () => {
    await window.watchdog.relock()
  }

  const unlockedTime = ctx?.unlockedAt
    ? new Date(ctx.unlockedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    : '--:--'

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 gap-6">
      {/* Icon */}
      <div className="w-24 h-24 rounded-full bg-green-900/30 border-2 border-green-700 flex items-center justify-center">
        <span className="text-4xl">🟢</span>
      </div>

      {/* Status */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-green-400 mb-2">条件已全部满足</h2>
        <p className="text-gray-300 text-sm">Dota 2 现在可以正常启动</p>
        <p className="text-gray-500 text-xs mt-1">
          解锁时间：{unlockedTime} · 今日有效
        </p>
      </div>

      {/* Problem solved */}
      {ctx?.currentProblem && (
        <div className="w-full max-w-sm rounded-lg border border-brand-border bg-brand-panel p-4">
          <p className="text-xs text-gray-500 mb-1">今日完成</p>
          <p className="text-sm text-white font-medium">{ctx.currentProblem.title}</p>
          <p className="text-xs text-gray-400 mt-1">
            {ctx.currentProblem.difficulty} · {ctx.currentProblem.tags.join(', ')}
          </p>
        </div>
      )}

      {/* Re-lock button */}
      <button
        onClick={handleRelock}
        className="px-6 py-2 rounded-lg border border-red-800 text-red-400 text-sm hover:bg-red-900/20 transition-colors"
      >
        重新锁定（自律加码）
      </button>

      <p className="text-xs text-gray-600 text-center max-w-xs">
        点击重新锁定将清除今日解锁记录，需要重新完成冷却和算法挑战。
      </p>
    </div>
  )
}
