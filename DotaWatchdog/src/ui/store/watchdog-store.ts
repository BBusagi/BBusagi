import { create } from 'zustand'

export type WatchdogState = 'LOCKED' | 'COOLDOWN' | 'CHALLENGE' | 'FOLLOW_UP' | 'UNLOCKED' | 'SETTINGS'

export interface Problem {
  id: string
  title: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  tags: string[]
  description: string
  constraints: string[]
  expected_concepts: string[]
  follow_up_override?: string
  leetcode_id?: number
}

export interface WatchdogContext {
  state: WatchdogState
  cooldownStartedAt: number | null
  cooldownDurationMs: number
  currentProblem: Problem | null
  followUpQuestion: string | null
  unlockedAt: number | null
  sessionDate: string
}

export interface VerificationResult {
  correct: boolean
  explanation_quality: 'good' | 'partial' | 'poor'
  difficulty_confirmed: string
  feedback: string
  follow_up_question?: string
}

interface WatchdogStore {
  ctx: WatchdogContext | null
  remainingMs: number
  progressPercent: number
  lastVerification: VerificationResult | null
  lastFollowUpFeedback: string | null
  dotaBlockedCount: number
  isSubmitting: boolean
  prevStateRef: WatchdogState | null

  setContext: (ctx: WatchdogContext) => void
  setCooldownTick: (remainingMs: number, progressPercent: number) => void
  setVerificationResult: (result: VerificationResult) => void
  setFollowUpFeedback: (feedback: string) => void
  incrementDotaBlocked: () => void
  setSubmitting: (v: boolean) => void
  clearVerification: () => void
}

export const useWatchdogStore = create<WatchdogStore>((set) => ({
  ctx: null,
  remainingMs: 0,
  progressPercent: 0,
  lastVerification: null,
  lastFollowUpFeedback: null,
  dotaBlockedCount: 0,
  isSubmitting: false,
  prevStateRef: null,

  setContext: (ctx) =>
    set((s) => ({
      ctx,
      prevStateRef: s.ctx?.state ?? null,
      // Clear verification when entering a new state
      lastVerification: s.ctx?.state !== ctx.state ? null : s.lastVerification,
      lastFollowUpFeedback: s.ctx?.state !== ctx.state ? null : s.lastFollowUpFeedback,
    })),

  setCooldownTick: (remainingMs, progressPercent) => set({ remainingMs, progressPercent }),

  setVerificationResult: (result) => set({ lastVerification: result, isSubmitting: false }),

  setFollowUpFeedback: (feedback) => set({ lastFollowUpFeedback: feedback, isSubmitting: false }),

  incrementDotaBlocked: () => set((s) => ({ dotaBlockedCount: s.dotaBlockedCount + 1 })),

  setSubmitting: (v) => set({ isSubmitting: v }),

  clearVerification: () => set({ lastVerification: null, lastFollowUpFeedback: null }),
}))
