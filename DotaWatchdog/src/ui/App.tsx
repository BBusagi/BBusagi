import React, { useState } from 'react'
import { useIpcListeners } from './hooks/useIpc'
import { useWatchdogStore } from './store/watchdog-store'
import { StatusBanner } from './components/StatusBanner'
import { CooldownView } from './views/CooldownView'
import { ChallengeView } from './views/ChallengeView'
import { FollowUpView } from './views/FollowUpView'
import { UnlockedView } from './views/UnlockedView'
import { SettingsView } from './views/SettingsView'

export const App: React.FC = () => {
  useIpcListeners()
  const { ctx, dotaBlockedCount } = useWatchdogStore()
  const [showSettings, setShowSettings] = useState(false)

  const state = ctx?.state ?? 'LOCKED'

  const renderBody = () => {
    if (showSettings) return <SettingsView onClose={() => setShowSettings(false)} />
    switch (state) {
      case 'COOLDOWN':  return <CooldownView />
      case 'CHALLENGE': return <ChallengeView />
      case 'FOLLOW_UP': return <FollowUpView />
      case 'UNLOCKED':  return <UnlockedView />
      default:
        return (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500 text-sm">
              <div className="text-3xl mb-3">🔴</div>
              <p>DotaWatchdog 已激活</p>
              <p className="text-xs mt-1 text-gray-600">正在初始化...</p>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="flex flex-col h-screen bg-brand-dark text-white overflow-hidden">
      {/* Title bar / status */}
      <StatusBanner state={showSettings ? 'SETTINGS' : state} dotaBlockedCount={dotaBlockedCount} />

      {/* Settings toggle (top-right gear) */}
      {!showSettings && state !== 'UNLOCKED' && (
        <div className="absolute top-2 right-8">
          <button
            onClick={() => setShowSettings(true)}
            className="text-gray-600 hover:text-gray-400 text-lg p-1"
            title="设置"
          >
            ⚙
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden pt-3">
        {renderBody()}
      </div>
    </div>
  )
}
