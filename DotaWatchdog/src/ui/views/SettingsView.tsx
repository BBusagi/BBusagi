import React, { useState, useEffect } from 'react'

interface Props {
  onClose: () => void
}

interface Settings {
  hasApiKey: boolean
  openaiApiKey: string
  cooldownMinutes: number
  autoStartWithWindows: boolean
}

export const SettingsView: React.FC<Props> = ({ onClose }) => {
  const [settings, setSettings] = useState<Settings>({
    hasApiKey: false,
    openaiApiKey: '',
    cooldownMinutes: 20,
    autoStartWithWindows: true,
  })
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    window.watchdog.getSettings().then((s) => {
      const settings = s as Settings
      setSettings(settings)
    })
  }, [])

  const handleTestKey = async () => {
    const key = apiKeyInput.trim()
    if (!key) return
    setTesting(true)
    setTestResult(null)
    const result = await window.watchdog.testApiKey(key)
    setTesting(false)
    setTestResult(result.success ? { success: true, message: 'API Key 验证成功' } : { success: false, message: result.error ?? '验证失败' })
  }

  const handleSave = async () => {
    setSaving(true)
    await window.watchdog.saveSettings({
      ...(apiKeyInput.trim() ? { openaiApiKey: apiKeyInput.trim() } : {}),
      cooldownMinutes: settings.cooldownMinutes,
      autoStartWithWindows: settings.autoStartWithWindows,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    if (apiKeyInput.trim()) {
      setApiKeyInput('')
      setSettings((s) => ({ ...s, hasApiKey: true }))
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-y-auto px-4 pb-4 gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">设置</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-sm">
          ← 返回
        </button>
      </div>

      {/* API Key */}
      <div className="rounded-lg border border-brand-border bg-brand-panel p-4 flex flex-col gap-3">
        <p className="text-sm font-medium text-white">OpenAI API Key</p>
        <p className="text-xs text-gray-500">
          用于 GPT-4o-mini 验证算法题解答。本地加密存储，不会上传。
          {settings.hasApiKey && <span className="text-green-500 ml-2">✓ 已配置</span>}
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            className="flex-1 bg-brand-dark border border-brand-border rounded px-3 py-2 text-sm text-gray-200 outline-none focus:border-orange-600 placeholder-gray-600"
            placeholder={settings.hasApiKey ? '输入新 Key 以替换' : 'sk-proj-...'}
            value={apiKeyInput}
            onChange={(e) => {
              setApiKeyInput(e.target.value)
              setTestResult(null)
            }}
          />
          <button
            onClick={handleTestKey}
            disabled={!apiKeyInput.trim() || testing}
            className="px-3 py-2 text-xs rounded border border-brand-border text-gray-400 hover:text-gray-200 hover:border-gray-500 disabled:opacity-40 transition-colors"
          >
            {testing ? '测试中...' : '测试'}
          </button>
        </div>
        {testResult && (
          <p className={`text-xs ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
            {testResult.message}
          </p>
        )}
      </div>

      {/* Cooldown */}
      <div className="rounded-lg border border-brand-border bg-brand-panel p-4 flex flex-col gap-3">
        <p className="text-sm font-medium text-white">冷却时长</p>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={5}
            max={60}
            step={5}
            value={settings.cooldownMinutes}
            onChange={(e) => setSettings((s) => ({ ...s, cooldownMinutes: Number(e.target.value) }))}
            className="flex-1 accent-orange-500"
          />
          <span className="text-sm text-orange-400 font-mono w-16 text-right">
            {settings.cooldownMinutes} 分钟
          </span>
        </div>
        <p className="text-xs text-gray-600">下次启动生效（当前冷却不受影响）</p>
      </div>

      {/* Auto-start */}
      <div className="rounded-lg border border-brand-border bg-brand-panel p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">开机自启</p>
          <p className="text-xs text-gray-500 mt-0.5">登录 Windows 时自动启动 DotaWatchdog</p>
        </div>
        <button
          onClick={() => setSettings((s) => ({ ...s, autoStartWithWindows: !s.autoStartWithWindows }))}
          className={`w-11 h-6 rounded-full transition-colors relative ${
            settings.autoStartWithWindows ? 'bg-orange-600' : 'bg-gray-700'
          }`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              settings.autoStartWithWindows ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={`w-full py-3 rounded-lg font-semibold text-sm transition-all ${
          saved
            ? 'bg-green-700 text-green-200'
            : 'bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-50'
        }`}
      >
        {saved ? '✓ 已保存' : saving ? '保存中...' : '保存设置'}
      </button>
    </div>
  )
}
