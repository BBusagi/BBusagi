import React, { useState } from 'react'
import Editor from '@monaco-editor/react'
import { ProblemCard } from '../components/ProblemCard'
import { useWatchdogStore } from '../store/watchdog-store'

export const ChallengeView: React.FC = () => {
  const { ctx, lastVerification, isSubmitting, setSubmitting } = useWatchdogStore()
  const problem = ctx?.currentProblem

  const [code, setCode] = useState('')
  const [explanation, setExplanation] = useState('')
  const [lang, setLang] = useState('python')

  if (!problem) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        正在加载题目...
      </div>
    )
  }

  const canSubmit = code.trim().length > 20 && explanation.trim().length > 30

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return
    setSubmitting(true)
    await window.watchdog.submitSolution(code, explanation)
    // Result handled by IPC push → store
  }

  const qualityColor: Record<string, string> = {
    good: 'text-green-400',
    partial: 'text-yellow-400',
    poor: 'text-red-400',
  }

  return (
    <div className="flex flex-col flex-1 overflow-y-auto gap-4 px-4 pb-4">
      {/* Problem */}
      <ProblemCard problem={problem} />

      {/* Language selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">语言：</span>
        {['python', 'javascript', 'typescript', 'java', 'cpp'].map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`text-xs px-3 py-1 rounded border transition-colors ${
              lang === l
                ? 'border-orange-600 text-orange-400 bg-orange-900/20'
                : 'border-brand-border text-gray-400 hover:border-gray-500'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Code editor */}
      <div className="rounded-lg overflow-hidden border border-brand-border">
        <Editor
          height="220px"
          language={lang}
          value={code}
          onChange={(v) => setCode(v ?? '')}
          theme="vs-dark"
          options={{
            fontSize: 13,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbers: 'on',
            wordWrap: 'on',
            padding: { top: 8, bottom: 8 },
          }}
        />
      </div>

      {/* Explanation */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">
          解题思路 <span className="text-gray-600">（必须包含：用了什么数据结构/算法、为什么、时间复杂度）</span>
        </label>
        <textarea
          className="w-full h-28 bg-brand-panel border border-brand-border rounded-lg p-3 text-sm text-gray-200 resize-none outline-none focus:border-orange-600 placeholder-gray-600 font-mono"
          placeholder="例：用哈希表存储已见过的值和下标，遍历数组时检查 target-nums[i] 是否在表中，O(n) 时间 O(n) 空间..."
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
        />
      </div>

      {/* Verification feedback */}
      {lastVerification && (
        <div
          className={`rounded-lg p-3 text-sm border ${
            lastVerification.correct
              ? 'bg-green-900/20 border-green-800 text-green-300'
              : 'bg-red-900/20 border-red-800 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span>{lastVerification.correct ? '✓ 通过' : '✗ 未通过'}</span>
            {lastVerification.explanation_quality && (
              <span className={`text-xs ${qualityColor[lastVerification.explanation_quality]}`}>
                解释质量：{lastVerification.explanation_quality}
              </span>
            )}
          </div>
          <p className="text-xs opacity-80">{lastVerification.feedback}</p>
        </div>
      )}

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit || isSubmitting}
        className={`w-full py-3 rounded-lg font-semibold text-sm transition-all ${
          isSubmitting
            ? 'bg-gray-700 text-gray-400 cursor-wait'
            : canSubmit
            ? 'bg-orange-600 hover:bg-orange-500 text-white'
            : 'bg-gray-800 text-gray-600 cursor-not-allowed'
        }`}
      >
        {isSubmitting ? '验证中...' : '提交解答'}
      </button>

      {!canSubmit && (
        <p className="text-center text-xs text-gray-600">
          代码和解释均需要足够的内容才能提交
        </p>
      )}
    </div>
  )
}
