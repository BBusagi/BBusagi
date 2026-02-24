import OpenAI from 'openai'
import { Problem, VerificationResult } from '../core/watchdog-state-machine'
import {
  VERIFY_SOLUTION_SYSTEM,
  buildVerifyUserPrompt,
  VERIFY_FOLLOW_UP_SYSTEM,
  buildFollowUpUserPrompt,
} from './prompts'

const MODEL = 'gpt-4o-mini'
const MAX_TOKENS = 512

export class Verifier {
  private client: OpenAI

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey })
  }

  async verifySolution(
    problem: Problem,
    code: string,
    explanation: string
  ): Promise<VerificationResult> {
    const response = await this.client.chat.completions.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: VERIFY_SOLUTION_SYSTEM },
        { role: 'user', content: buildVerifyUserPrompt(problem, code, explanation) },
      ],
    })

    const raw = response.choices[0].message.content ?? ''
    let parsed: Partial<VerificationResult> | null = null
    try {
      parsed = JSON.parse(raw)
    } catch {
      return {
        correct: false,
        explanation_quality: 'poor',
        difficulty_confirmed: problem.difficulty as VerificationResult['difficulty_confirmed'],
        feedback: '验证服务返回了意外的格式，请重试。',
      }
    }

    if (!parsed || typeof parsed.correct !== 'boolean') {
      return {
        correct: false,
        explanation_quality: 'poor',
        difficulty_confirmed: problem.difficulty as VerificationResult['difficulty_confirmed'],
        feedback: '验证服务返回了意外的格式，请重试。',
      }
    }

    const result: VerificationResult = {
      correct: parsed.correct,
      explanation_quality: parsed.explanation_quality ?? 'poor',
      difficulty_confirmed: parsed.difficulty_confirmed ?? (problem.difficulty as VerificationResult['difficulty_confirmed']),
      feedback: parsed.feedback ?? '',
      follow_up_question: parsed.follow_up_question ?? undefined,
    }

    // If problem has a pre-defined follow-up, override the AI-generated one
    if (result.correct && problem.follow_up_override &&
        (result.difficulty_confirmed === 'Easy' || result.difficulty_confirmed === 'Simple')) {
      result.follow_up_question = problem.follow_up_override
    }

    return result
  }

  async verifyFollowUp(
    problem: Problem,
    question: string,
    explanation: string
  ): Promise<{ acceptable: boolean; feedback: string }> {
    const response = await this.client.chat.completions.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: VERIFY_FOLLOW_UP_SYSTEM },
        { role: 'user', content: buildFollowUpUserPrompt(problem, question, explanation) },
      ],
    })

    const raw = response.choices[0].message.content ?? ''
    let parsed: { acceptable?: boolean; feedback?: string } | null = null
    try {
      parsed = JSON.parse(raw)
    } catch {
      return { acceptable: false, feedback: '验证服务返回了意外的格式，请重试。' }
    }

    if (!parsed || typeof parsed.acceptable !== 'boolean') {
      return { acceptable: false, feedback: '验证服务返回了意外的格式，请重试。' }
    }

    return {
      acceptable: parsed.acceptable,
      feedback: parsed.feedback ?? '',
    }
  }

  async ping(): Promise<void> {
    await this.client.chat.completions.create({
      model: MODEL,
      max_tokens: 8,
      messages: [{ role: 'user', content: 'ping' }],
    })
  }
}
