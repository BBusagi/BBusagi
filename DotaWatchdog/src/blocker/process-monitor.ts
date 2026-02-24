import { execSync } from 'child_process'
import { WatchdogStateMachine } from '../core/watchdog-state-machine'
import { BrowserWindow } from 'electron'
import notifier from 'node-notifier'

const DOTA_PROCESSES = ['dota2.exe', 'dota2launcher.exe']
const POLL_INTERVAL_MS = 2000

const BLOCKED_MESSAGES: Record<string, string> = {
  COOLDOWN: (remaining: string) => `冷却中，还需等待 ${remaining}`,
  CHALLENGE: () => '需要完成算法题才能启动 Dota 2',
  FOLLOW_UP: () => '需要完成追加问题才能启动 Dota 2',
  LOCKED: () => '请先打开 DotaWatchdog',
}

function formatMs(ms: number): string {
  const totalSec = Math.ceil(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return m > 0 ? `${m}分${s}秒` : `${s}秒`
}

export class ProcessMonitor {
  private timer: NodeJS.Timeout | null = null
  private machine: WatchdogStateMachine
  private win: BrowserWindow | null = null
  private lastNotifyTime = 0

  constructor(machine: WatchdogStateMachine) {
    this.machine = machine
  }

  setWindow(win: BrowserWindow): void {
    this.win = win
  }

  start(): void {
    this.stop()
    this.timer = setInterval(() => this.tick(), POLL_INTERVAL_MS)
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private tick(): void {
    if (!this.machine.isBlocking()) return

    for (const proc of DOTA_PROCESSES) {
      if (this.isRunning(proc)) {
        this.kill(proc)
        this.notifyBlocked(proc)
        if (this.win && !this.win.isDestroyed()) {
          this.win.webContents.send('push:dota_blocked', { processName: proc })
          // Bring window to front so user can complete the challenge
          if (this.win.isMinimized()) this.win.restore()
          this.win.focus()
        }
      }
    }
  }

  private isRunning(name: string): boolean {
    try {
      const out = execSync(`tasklist /FI "IMAGENAME eq ${name}" /NH`, {
        encoding: 'utf8',
        timeout: 1500,
        windowsHide: true,
      })
      return out.toLowerCase().includes(name.toLowerCase())
    } catch {
      return false
    }
  }

  private kill(name: string): void {
    try {
      execSync(`taskkill /F /IM "${name}"`, {
        timeout: 3000,
        windowsHide: true,
      })
    } catch {
      // May fail if process already exited — ignore
    }
  }

  private notifyBlocked(processName: string): void {
    // Throttle notifications: at most once per 5 seconds
    const now = Date.now()
    if (now - this.lastNotifyTime < 5000) return
    this.lastNotifyTime = now

    const state = this.machine.getState()
    let message = ''
    if (state === 'COOLDOWN') {
      message = `冷却中，还需等待 ${formatMs(this.machine.getRemainingMs())}`
    } else if (state === 'CHALLENGE') {
      message = '需要完成算法题才能启动 Dota 2'
    } else if (state === 'FOLLOW_UP') {
      message = '需要完成追加问题才能启动 Dota 2'
    } else {
      message = '请先打开 DotaWatchdog 完成解锁流程'
    }

    notifier.notify({
      title: 'DotaWatchdog — 已拦截',
      message,
      icon: undefined,
      sound: false,
      wait: false,
    })
  }
}
