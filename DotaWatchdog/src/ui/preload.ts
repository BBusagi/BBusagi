import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Requests (renderer → main)
  getState: () => ipcRenderer.invoke('req:get_state'),
  getSettings: () => ipcRenderer.invoke('req:get_settings'),
  saveSettings: (s: object) => ipcRenderer.invoke('req:save_settings', s),
  submitSolution: (code: string, explanation: string) =>
    ipcRenderer.invoke('req:submit_solution', { code, explanation }),
  submitFollowUp: (explanation: string) =>
    ipcRenderer.invoke('req:submit_follow_up', { explanation }),
  relock: () => ipcRenderer.invoke('req:relock'),
  testApiKey: (key: string) => ipcRenderer.invoke('req:test_api_key', key),

  // Push subscriptions (main → renderer)
  onStateChanged: (cb: (ctx: unknown) => void) => {
    ipcRenderer.on('push:state_changed', (_e, ctx) => cb(ctx))
  },
  onCooldownTick: (cb: (data: { remainingMs: number; progressPercent: number }) => void) => {
    ipcRenderer.on('push:cooldown_tick', (_e, data) => cb(data))
  },
  onVerificationResult: (cb: (result: unknown) => void) => {
    ipcRenderer.on('push:verification_result', (_e, result) => cb(result))
  },
  onDotaBlocked: (cb: (data: { processName: string }) => void) => {
    ipcRenderer.on('push:dota_blocked', (_e, data) => cb(data))
  },
  onFollowUpFailed: (cb: (result: unknown) => void) => {
    ipcRenderer.on('push:follow_up_failed', (_e, result) => cb(result))
  },

  // Cleanup
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  },
}

contextBridge.exposeInMainWorld('watchdog', api)

export type WatchdogAPI = typeof api
