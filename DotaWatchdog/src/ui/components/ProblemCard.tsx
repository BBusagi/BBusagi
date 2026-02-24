import React from 'react'
import { Problem } from '../store/watchdog-store'

interface Props {
  problem: Problem
  collapsed?: boolean
  onToggle?: () => void
}

const difficultyColor: Record<string, string> = {
  Easy: 'text-green-400 border-green-700',
  Medium: 'text-yellow-400 border-yellow-700',
  Hard: 'text-red-400 border-red-700',
}

export const ProblemCard: React.FC<Props> = ({ problem, collapsed = false, onToggle }) => {
  const colorClass = difficultyColor[problem.difficulty] ?? 'text-gray-400 border-gray-700'

  return (
    <div className="rounded-lg border border-brand-border bg-brand-panel p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <h2 className="text-white font-semibold text-base">{problem.title}</h2>
          {problem.leetcode_id && (
            <span className="text-xs text-gray-500">#{problem.leetcode_id}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono border rounded px-2 py-0.5 ${colorClass}`}>
            {problem.difficulty}
          </span>
          {onToggle && (
            <button
              onClick={onToggle}
              className="text-gray-500 hover:text-gray-300 text-xs ml-1"
            >
              {collapsed ? '展开' : '收起'}
            </button>
          )}
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-3">
        {problem.tags.map((tag) => (
          <span
            key={tag}
            className="text-xs bg-brand-dark text-gray-400 rounded px-2 py-0.5 border border-brand-border"
          >
            {tag}
          </span>
        ))}
      </div>

      {!collapsed && (
        <>
          {/* Description */}
          <pre className="text-sm text-gray-200 whitespace-pre-wrap font-mono leading-relaxed bg-brand-dark rounded p-3 mb-3">
            {problem.description}
          </pre>

          {/* Constraints */}
          {problem.constraints.length > 0 && (
            <div className="text-xs text-gray-400">
              <span className="text-gray-500">Constraints: </span>
              {problem.constraints.join(' · ')}
            </div>
          )}
        </>
      )}
    </div>
  )
}
