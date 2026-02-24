import React, { useState } from 'react'
import { ProblemCard } from '../components/ProblemCard'
import { useWatchdogStore } from '../store/watchdog-store'

export const FollowUpView: React.FC = () => {
  const { ctx, lastFollowUpFeedback, isSubmitting, setSubmitting } = useWatchdogStore()
  const problem = ctx?.currentProblem
  const question = ctx?.followUpQuestion

  const [explanation, setExplanation] = useState('')
  const [problemCollapsed, setProblemCollapsed] = useState(true)

  if (!problem || !question) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        加载中...
      </div>
    )
  }

  const canSubmit = explanation.trim().length > 20

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return
    setSubmitting(true)
    await window.watchdog.submitFollowUp(explanation)
  }

  return (
    <div className="flex flex-col flex-1 overflow-y-auto gap-4 px-4 pb-4">
      {/* Header */}
      <div className="rounded-lg border border-blue-800 bg-blue-900/20 p-3">
        <p className="text-xs text-blue-400 font-semibold mb-1">
          ✓ 基础题已通过 — 追加深化问题
        </p>
        <p className="text-xs text-gray-400">
          题目难度为 Easy，需要回答以下深化问题后方可解锁。
        </p>
      </div>

      {/* Original problem (collapsed by default) */}
      <ProblemCard
        problem={problem}
        collapsed={problemCollapsed}
        onToggle={() => setProblemCollapsed(!problemCollapsed)}
      />

      {/* Follow-up question */}
      <div className="rounded-lg border border-brand-border bg-brand-panel p-4">
        <p className="text-xs text-gray-500 mb-2 font-semibold">追加问题</p>
        <p className="text-sm text-yellow-300 leading-relaxed">{question}</p>
      </div>

      {/* Answer input */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">
          你的回答 <span className="text-gray-600">（用文字描述思路即可，不需要完整代码）</span>
        </label>
        <textarea
          className="w-full h-32 bg-brand-panel border border-brand-border rounded-lg p-3 text-sm text-gray-200 resize-none outline-none focus:border-blue-600 placeholder-gray-600 font-mono"
          placeholder="描述你的思路..."
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
        />
      </div>

      {/* Feedback */}
      {lastFollowUpFeedback && (
        <div className="rounded-lg p-3 text-sm border bg-red-900/20 border-red-800 text-red-300">
          <p className="text-xs">{lastFollowUpFeedback}</p>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit || isSubmitting}
        className={`w-full py-3 rounded-lg font-semibold text-sm transition-all ${
          isSubmitting
            ? 'bg-gray-700 text-gray-400 cursor-wait'
            : canSubmit
            ? 'bg-blue-600 hover:bg-blue-500 text-white'
            : 'bg-gray-800 text-gray-600 cursor-not-allowed'
        }`}
      >
        {isSubmitting ? '验证中...' : '提交回答'}
      </button>
    </div>
  )
}
