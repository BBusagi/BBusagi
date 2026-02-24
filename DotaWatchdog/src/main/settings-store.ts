import Store from 'electron-store'
import { safeStorage } from 'electron'

interface StoreSchema {
  encryptedApiKey: string
  cooldownMinutes: number
  autoStartWithWindows: boolean
}

export interface AppSettings {
  openaiApiKey: string
  cooldownMinutes: number
  autoStartWithWindows: boolean
}

const store = new Store<StoreSchema>({
  defaults: {
    encryptedApiKey: '',
    cooldownMinutes: 20,
    autoStartWithWindows: true,
  },
})

export const settingsStore = {
  getAll(): AppSettings {
    const encryptedKey = store.get('encryptedApiKey', '')
    let apiKey = ''
    if (encryptedKey && safeStorage.isEncryptionAvailable()) {
      try {
        apiKey = safeStorage.decryptString(Buffer.from(encryptedKey, 'base64'))
      } catch {
        apiKey = ''
      }
    }
    return {
      openaiApiKey: apiKey,
      cooldownMinutes: store.get('cooldownMinutes', 20),
      autoStartWithWindows: store.get('autoStartWithWindows', true),
    }
  },

  saveApiKey(key: string): void {
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(key)
      store.set('encryptedApiKey', encrypted.toString('base64'))
    }
  },

  saveCooldownMinutes(minutes: number): void {
    store.set('cooldownMinutes', Math.max(1, Math.min(120, minutes)))
  },

  saveAutoStart(enabled: boolean): void {
    store.set('autoStartWithWindows', enabled)
  },

  save(settings: Partial<AppSettings>): void {
    if (settings.openaiApiKey !== undefined) {
      this.saveApiKey(settings.openaiApiKey)
    }
    if (settings.cooldownMinutes !== undefined) {
      this.saveCooldownMinutes(settings.cooldownMinutes)
    }
    if (settings.autoStartWithWindows !== undefined) {
      this.saveAutoStart(settings.autoStartWithWindows)
    }
  },
}
