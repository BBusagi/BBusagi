import { ipcMain, BrowserWindow, app } from 'electron'
import { WatchdogStateMachine } from '../core/watchdog-state-machine'
import { ProcessMonitor } from '../blocker/process-monitor'
import { settingsStore, AppSettings } from './settings-store'
import { Verifier } from '../ai/verifier'
import { ProblemBank } from '../challenge/problem-bank'

export function registerIpcHandlers(
  win: BrowserWindow,
  machine: WatchdogStateMachine,
  monitor: ProcessMonitor,
  verifier: { instance: Verifier | null },
  problemBank: ProblemBank
): void {
  // Get current state
  ipcMain.handle('req:get_state', () => {
    const ctx = machine.getContext()
    // If entering CHALLENGE and no problem assigned yet, pick one
    if (ctx.state === 'CHALLENGE' && !ctx.currentProblem) {
      const problem = problemBank.getRandomProblem()
      machine.setProblem(problem)
      return machine.getContext()
    }
    return ctx
  })

  // Get settings
  ipcMain.handle('req:get_settings', () => {
    const s = settingsStore.getAll()
    // Mask API key for display
    return {
      ...s,
      openaiApiKey: s.openaiApiKey ? '••••••••' + s.openaiApiKey.slice(-4) : '',
      hasApiKey: s.openaiApiKey.length > 0,
    }
  })

  // Save settings
  ipcMain.handle('req:save_settings', (_event, settings: Partial<AppSettings & { openaiApiKey: string }>) => {
    settingsStore.save(settings)

    // Update auto-start
    if (settings.autoStartWithWindows !== undefined) {
      app.setLoginItemSettings({ openAtLogin: settings.autoStartWithWindows })
    }

    // Update cooldown duration in machine
    if (settings.cooldownMinutes !== undefined) {
      machine.updateCooldownDuration(settings.cooldownMinutes * 60 * 1000)
    }

    // Rebuild verifier with new key
    if (settings.openaiApiKey && !settings.openaiApiKey.startsWith('••')) {
      const newKey = settingsStore.getAll().openaiApiKey
      verifier.instance = new Verifier(newKey)
    }

    return { success: true }
  })

  // Submit solution
  ipcMain.handle('req:submit_solution', async (_event, { code, explanation }: { code: string; explanation: string }) => {
    const ctx = machine.getContext()
    if (ctx.state !== 'CHALLENGE' || !ctx.currentProblem) {
      return { error: '当前不在挑战阶段' }
    }

    if (!verifier.instance) {
      return { error: '请先在设置中配置 OpenAI API Key' }
    }

    try {
      const result = await verifier.instance.verifySolution(ctx.currentProblem, code, explanation)
      machine.onVerificationResult(result)
      win.webContents.send('push:verification_result', result)
      return result
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '未知错误'
      return { error: `验证失败：${message}` }
    }
  })

  // Submit follow-up answer
  ipcMain.handle('req:submit_follow_up', async (_event, { explanation }: { explanation: string }) => {
    const ctx = machine.getContext()
    if (ctx.state !== 'FOLLOW_UP' || !ctx.currentProblem || !ctx.followUpQuestion) {
      return { error: '当前不在追加问题阶段' }
    }

    if (!verifier.instance) {
      return { error: '请先在设置中配置 OpenAI API Key' }
    }

    try {
      const result = await verifier.instance.verifyFollowUp(
        ctx.currentProblem,
        ctx.followUpQuestion,
        explanation
      )
      machine.onFollowUpResult(result.acceptable)
      if (!result.acceptable) {
        win.webContents.send('push:follow_up_failed', result)
      }
      return result
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '未知错误'
      return { error: `验证失败：${message}` }
    }
  })

  // Re-lock
  ipcMain.handle('req:relock', () => {
    machine.relock()
    return { success: true }
  })

  // Test API key
  ipcMain.handle('req:test_api_key', async (_event, key: string) => {
    try {
      const testVerifier = new Verifier(key)
      await testVerifier.ping()
      return { success: true }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '连接失败'
      return { success: false, error: message }
    }
  })
}
