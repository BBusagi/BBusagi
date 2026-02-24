import { app, BrowserWindow } from 'electron'
import * as path from 'path'
import { WatchdogStateMachine } from '../core/watchdog-state-machine'
import { ProcessMonitor } from '../blocker/process-monitor'
import { CooldownTimer } from '../cooldown/cooldown-timer'
import { settingsStore } from './settings-store'
import { setupTray } from './tray'
import { registerIpcHandlers } from './ipc-handler'
import { Verifier } from '../ai/verifier'
import { ProblemBank } from '../challenge/problem-bank'

const isDev = !app.isPackaged

// Single instance lock
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
  process.exit(0)
}

let win: BrowserWindow | null = null

function createWindow(): BrowserWindow {
  const w = new BrowserWindow({
    width: 640,
    height: 720,
    minWidth: 580,
    minHeight: 600,
    frame: false,
    resizable: true,
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, '../ui/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    w.loadURL('http://localhost:5173')
    w.webContents.openDevTools({ mode: 'detach' })
  } else {
    w.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  // Prevent close — hide to tray instead
  w.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault()
      w.hide()
    }
  })

  return w
}

async function main() {
  await app.whenReady()

  const settings = settingsStore.getAll()

  // Init state machine
  const machine = new WatchdogStateMachine(settings.cooldownMinutes * 60 * 1000)

  // Init problem bank
  const problemBank = new ProblemBank()

  // Init verifier (may be null if no key configured)
  const verifierRef: { instance: Verifier | null } = {
    instance: settings.openaiApiKey ? new Verifier(settings.openaiApiKey) : null,
  }

  // Create window
  win = createWindow()

  // Init process monitor
  const monitor = new ProcessMonitor(machine)
  monitor.setWindow(win)
  monitor.start()

  // Init cooldown timer
  const cooldownTimer = new CooldownTimer(machine)
  cooldownTimer.setWindow(win)

  // Register IPC handlers
  registerIpcHandlers(win, machine, monitor, verifierRef, problemBank)

  // Wire state machine events → IPC push to renderer
  machine.on('state_changed', (ctx) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('push:state_changed', ctx)
      // When transitioning to CHALLENGE, ensure a problem is assigned
      if (ctx.state === 'CHALLENGE' && !ctx.currentProblem) {
        const problem = problemBank.getRandomProblem()
        machine.setProblem(problem)
        win.webContents.send('push:state_changed', machine.getContext())
      }
    }
    // Start/stop cooldown timer based on state
    if (ctx.state === 'COOLDOWN') {
      cooldownTimer.start()
    } else {
      cooldownTimer.stop()
    }
  })

  machine.on('verification_failed', (result) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('push:verification_result', result)
    }
  })

  // Initialize state machine (loads persisted state)
  await machine.initialize()

  // Apply auto-start setting
  app.setLoginItemSettings({ openAtLogin: settings.autoStartWithWindows })

  // Setup tray
  setupTray(win, machine)

  // On second instance attempt, show the window
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    }
  })

  app.on('window-all-closed', (e: Event) => {
    // Keep running in background (tray)
    e.preventDefault()
  })

  app.on('before-quit', () => {
    (app as any).isQuitting = true
  })
}

main().catch(console.error)
