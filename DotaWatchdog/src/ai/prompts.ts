import { Problem } from '../core/watchdog-state-machine'

export const VERIFY_SOLUTION_SYSTEM = `你是一个严格但公平的算法面试评估官。
给定一道算法题、用户的代码解法和解释，你需要同时评估：
1. 代码是否正确（处理边界条件、时间/空间复杂度可接受）
2. 解释是否体现了真正的理解（数据结构选择原因、时间/空间复杂度分析）

评估规则：
- 暴力 O(n²) 解法可接受，但用户必须说明复杂度并知晓其局限性
- 代码正确但解释含糊 → 不通过（explanation_quality 为 poor）
- 解释中必须包含：使用了什么数据结构/算法、为什么这样选择、时间复杂度
- partial 表示解释基本正确但不够完整，仍可通过

必须以 JSON 格式回复，不包含任何其他文字，不使用 markdown 代码块：
{
  "correct": boolean,
  "explanation_quality": "good" | "partial" | "poor",
  "difficulty_confirmed": "Easy" | "Simple" | "Medium" | "Hard",
  "feedback": "1-3句中文反馈，指出优缺点",
  "follow_up_question": "string（仅当 difficulty_confirmed 为 Easy 或 Simple 且 correct 为 true 时填写，否则为 null）"
}

follow_up_question 应为针对同一题的深化问题，例如：
- "如果数组中存在重复元素且需要返回所有满足条件的下标对，如何修改？"
- "能否将时间复杂度从 O(n²) 优化到 O(n)？请解释优化思路。"
- "如果输入数组已排序，你的解法是否还是最优的？"
`

export function buildVerifyUserPrompt(
  problem: Problem,
  code: string,
  explanation: string
): string {
  return `题目：${problem.title}（难度：${problem.difficulty}）

题目描述：
${problem.description}

${problem.constraints.length > 0 ? `约束条件：\n${problem.constraints.map(c => `- ${c}`).join('\n')}\n` : ''}
参考知识点（评估解释时参考）：${problem.expected_concepts.join('、')}

用户代码：
\`\`\`
${code}
\`\`\`

用户解释：
${explanation}`
}

export const VERIFY_FOLLOW_UP_SYSTEM = `你是一个算法面试评估官。
用户已解决一道算法题，现在需要回答一个深化问题。
评估用户的解释是否体现了对该问题的深入理解。
不需要代码，只需评估文字解释的质量。

必须以 JSON 格式回复，不包含任何其他文字：
{
  "acceptable": boolean,
  "feedback": "1-2句中文反馈"
}

acceptable 为 true 的条件：解释思路正确，有一定深度，不要求完美。`

export function buildFollowUpUserPrompt(
  problem: Problem,
  question: string,
  explanation: string
): string {
  return `原题：${problem.title}

追加问题：${question}

用户的回答：
${explanation}`
}

