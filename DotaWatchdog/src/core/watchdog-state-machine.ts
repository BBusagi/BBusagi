import { EventEmitter } from 'events'
import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'

export type WatchdogState =
  | 'LOCKED'
  | 'COOLDOWN'
  | 'CHALLENGE'
  | 'FOLLOW_UP'
  | 'UNLOCKED'
  | 'SETTINGS'

export interface Problem {
  id: string
  title: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  tags: string[]
  description: string
  constraints: string[]
  expected_concepts: string[]
  follow_up_override?: string  // If set, used as follow-up instead of Claude's generated one
}

export interface VerificationResult {
  correct: boolean
  explanation_quality: 'good' | 'partial' | 'poor'
  difficulty_confirmed: 'Easy' | 'Simple' | 'Medium' | 'Hard'
  feedback: string
  follow_up_question?: string
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

const today = (): string => new Date().toISOString().slice(0, 10)

export class WatchdogStateMachine extends EventEmitter {
  private ctx: WatchdogContext
  private persistPath: string

  constructor(cooldownDurationMs: number = 20 * 60 * 1000) {
    super()
    this.persistPath = path.join(app.getPath('userData'), 'watchdog-state.json')
    this.ctx = {
      state: 'LOCKED',
      cooldownStartedAt: null,
      cooldownDurationMs,
      currentProblem: null,
      followUpQuestion: null,
      unlockedAt: null,
      sessionDate: today(),
    }
  }

  async initialize(): Promise<void> {
    this.loadPersisted()
    const now = today()

    // Daily reset: if sessionDate differs, reset entirely
    if (this.ctx.sessionDate !== now) {
      this.ctx = {
        ...this.ctx,
        state: 'LOCKED',
        cooldownStartedAt: null,
        currentProblem: null,
        followUpQuestion: null,
        unlockedAt: null,
        sessionDate: now,
      }
      this.persist()
    }

    // If already unlocked today, stay unlocked
    if (this.ctx.state === 'UNLOCKED') {
      this.emit('state_changed', this.ctx)
      return
    }

    // Start or resume cooldown
    if (!this.ctx.cooldownStartedAt) {
      this.ctx.cooldownStartedAt = Date.now()
      this.persist()
    }

    const elapsed = Date.now() - this.ctx.cooldownStartedAt
    if (elapsed >= this.ctx.cooldownDurationMs) {
      this.transitionToChallenge()
    } else {
      this.ctx.state = 'COOLDOWN'
      this.persist()
    }

    this.emit('state_changed', this.ctx)
  }

  getState(): WatchdogState {
    return this.ctx.state
  }

  getContext(): WatchdogContext {
    return { ...this.ctx }
  }

  getRemainingMs(): number {
    if (!this.ctx.cooldownStartedAt) return this.ctx.cooldownDurationMs
    const elapsed = Date.now() - this.ctx.cooldownStartedAt
    return Math.max(0, this.ctx.cooldownDurationMs - elapsed)
  }

  getProgressPercent(): number {
    if (!this.ctx.cooldownStartedAt) return 0
    const elapsed = Date.now() - this.ctx.cooldownStartedAt
    return Math.min(100, (elapsed / this.ctx.cooldownDurationMs) * 100)
  }

  isBlocking(): boolean {
    return this.ctx.state !== 'UNLOCKED'
  }

  onCooldownExpired(): void {
    if (this.ctx.state !== 'COOLDOWN') return
    this.transitionToChallenge()
  }

  setProblem(problem: Problem): void {
    this.ctx.currentProblem = problem
    this.persist()
  }

  onVerificationResult(result: VerificationResult): void {
    if (this.ctx.state !== 'CHALLENGE') return

    if (!result.correct || result.explanation_quality === 'poor') {
      // Stay in CHALLENGE, just emit for UI to show feedback
      this.emit('verification_failed', result)
      return
    }

    const isEasy = result.difficulty_confirmed === 'Easy' || result.difficulty_confirmed === 'Simple'
    if (isEasy && result.follow_up_question) {
      this.ctx.state = 'FOLLOW_UP'
      this.ctx.followUpQuestion = result.follow_up_question
      this.persist()
      this.emit('state_changed', this.ctx)
    } else {
      this.unlock()
    }
  }

  onFollowUpResult(acceptable: boolean): void {
    if (this.ctx.state !== 'FOLLOW_UP') return
    if (acceptable) {
      this.unlock()
    } else {
      this.emit('follow_up_failed')
    }
  }

  relock(): void {
    this.ctx = {
      ...this.ctx,
      state: 'LOCKED',
      cooldownStartedAt: null,
      currentProblem: null,
      followUpQuestion: null,
      unlockedAt: null,
    }
    this.persist()
    // Re-initialize to start a fresh cooldown
    this.initialize()
  }

  updateCooldownDuration(ms: number): void {
    this.ctx.cooldownDurationMs = ms
    this.persist()
  }

  private transitionToChallenge(): void {
    this.ctx.state = 'CHALLENGE'
    this.persist()
    this.emit('state_changed', this.ctx)
  }

  private unlock(): void {
    this.ctx.state = 'UNLOCKED'
    this.ctx.unlockedAt = Date.now()
    this.persist()
    this.emit('state_changed', this.ctx)
  }

  private persist(): void {
    try {
      fs.writeFileSync(this.persistPath, JSON.stringify(this.ctx, null, 2), 'utf-8')
    } catch {
      // Non-fatal: if we can't persist, worst case is cooldown resets on restart
    }
  }

  private loadPersisted(): void {
    try {
      if (fs.existsSync(this.persistPath)) {
        const raw = fs.readFileSync(this.persistPath, 'utf-8')
        const saved = JSON.parse(raw) as Partial<WatchdogContext>
        this.ctx = { ...this.ctx, ...saved }
      }
    } catch {
      // Use defaults if file is corrupt
    }
  }
}
