import { WatchdogStateMachine } from '../core/watchdog-state-machine'
import { BrowserWindow } from 'electron'

export class CooldownTimer {
  private timer: NodeJS.Timeout | null = null
  private tickTimer: NodeJS.Timeout | null = null
  private machine: WatchdogStateMachine
  private win: BrowserWindow | null = null

  constructor(machine: WatchdogStateMachine) {
    this.machine = machine
  }

  setWindow(win: BrowserWindow): void {
    this.win = win
  }

  start(): void {
    this.stop()

    // Check immediately and then every second
    this.tick()
    this.tickTimer = setInterval(() => this.tick(), 1000)
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    if (this.tickTimer) {
      clearInterval(this.tickTimer)
      this.tickTimer = null
    }
  }

  private tick(): void {
    const state = this.machine.getState()
    if (state !== 'COOLDOWN') {
      // If no longer in cooldown (e.g. unlocked from a previous session), stop
      if (state === 'UNLOCKED' || state === 'CHALLENGE' || state === 'FOLLOW_UP') {
        this.stop()
        return
      }
      return
    }

    const remainingMs = this.machine.getRemainingMs()
    const progressPercent = this.machine.getProgressPercent()

    // Push tick to renderer
    if (this.win && !this.win.isDestroyed()) {
      this.win.webContents.send('push:cooldown_tick', { remainingMs, progressPercent })
    }

    // Cooldown complete
    if (remainingMs <= 0) {
      this.stop()
      this.machine.onCooldownExpired()
    }
  }
}
