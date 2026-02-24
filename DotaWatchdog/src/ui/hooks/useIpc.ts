import { useEffect } from 'react'
import { useWatchdogStore, WatchdogContext, VerificationResult } from '../store/watchdog-store'

declare global {
  interface Window {
    watchdog: {
      getState: () => Promise<WatchdogContext>
      getSettings: () => Promise<unknown>
      saveSettings: (s: object) => Promise<unknown>
      submitSolution: (code: string, explanation: string) => Promise<VerificationResult & { error?: string }>
      submitFollowUp: (explanation: string) => Promise<{ acceptable: boolean; feedback: string; error?: string }>
      relock: () => Promise<unknown>
      testApiKey: (key: string) => Promise<{ success: boolean; error?: string }>
      onStateChanged: (cb: (ctx: WatchdogContext) => void) => void
      onCooldownTick: (cb: (data: { remainingMs: number; progressPercent: number }) => void) => void
      onVerificationResult: (cb: (result: VerificationResult) => void) => void
      onDotaBlocked: (cb: (data: { processName: string }) => void) => void
      onFollowUpFailed: (cb: (result: { feedback: string }) => void) => void
      removeAllListeners: (channel: string) => void
    }
  }
}

export function useIpcListeners() {
  const { setContext, setCooldownTick, setVerificationResult, setFollowUpFeedback, incrementDotaBlocked } =
    useWatchdogStore()

  useEffect(() => {
    // Load initial state
    window.watchdog.getState().then((ctx) => {
      if (ctx) setContext(ctx)
    })

    // Subscribe to push events
    window.watchdog.onStateChanged((ctx) => setContext(ctx))
    window.watchdog.onCooldownTick(({ remainingMs, progressPercent }) =>
      setCooldownTick(remainingMs, progressPercent)
    )
    window.watchdog.onVerificationResult((result) => setVerificationResult(result))
    window.watchdog.onDotaBlocked(() => incrementDotaBlocked())
    window.watchdog.onFollowUpFailed((result) => setFollowUpFeedback(result.feedback))

    return () => {
      window.watchdog.removeAllListeners('push:state_changed')
      window.watchdog.removeAllListeners('push:cooldown_tick')
      window.watchdog.removeAllListeners('push:verification_result')
      window.watchdog.removeAllListeners('push:dota_blocked')
      window.watchdog.removeAllListeners('push:follow_up_failed')
    }
  }, [])
}
