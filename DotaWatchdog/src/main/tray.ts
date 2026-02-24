import { Tray, Menu, BrowserWindow, app, nativeImage } from 'electron'
import * as path from 'path'
import { WatchdogStateMachine } from '../core/watchdog-state-machine'

let tray: Tray | null = null

function getIconPath(locked: boolean): string {
  const iconFile = locked ? 'icon-locked.ico' : 'icon-unlocked.ico'
  // In dev, assets are in project root; in prod, next to the exe
  const base = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets')
  return path.join(base, iconFile)
}

export function setupTray(win: BrowserWindow, machine: WatchdogStateMachine): void {
  const iconPath = getIconPath(true)
  const icon = nativeImage.createFromPath(iconPath)

  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
  tray.setToolTip('DotaWatchdog')

  updateTrayMenu(win, machine)

  // Update tray when state changes
  machine.on('state_changed', () => {
    const locked = machine.isBlocking()
    const newIconPath = getIconPath(locked)
    const newIcon = nativeImage.createFromPath(newIconPath)
    if (!newIcon.isEmpty()) {
      tray?.setImage(newIcon)
    }
    updateTrayMenu(win, machine)
  })

  tray.on('click', () => {
    if (win.isVisible()) {
      win.focus()
    } else {
      win.show()
      win.focus()
    }
  })
}

function updateTrayMenu(win: BrowserWindow, machine: WatchdogStateMachine): void {
  if (!tray) return

  const state = machine.getState()
  const isUnlocked = state === 'UNLOCKED'

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'DotaWatchdog',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: `状态：${getStateLabel(state)}`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: '打开',
      click: () => {
        win.show()
        win.focus()
      },
    },
    {
      label: '重新锁定',
      enabled: isUnlocked,
      click: () => {
        machine.relock()
        win.show()
        win.focus()
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)
}

function getStateLabel(state: string): string {
  const labels: Record<string, string> = {
    LOCKED: '🔴 锁定中',
    COOLDOWN: '⏳ 冷却中',
    CHALLENGE: '🧩 待完成算法题',
    FOLLOW_UP: '💬 待完成追加问题',
    UNLOCKED: '🟢 已解锁',
    SETTINGS: '⚙️ 设置中',
  }
  return labels[state] ?? state
}
