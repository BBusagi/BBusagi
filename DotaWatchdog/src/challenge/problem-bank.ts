import * as path from 'path'
import { Problem } from '../core/watchdog-state-machine'

interface ProblemsFile {
  version: string
  problems: Problem[]
}

export class ProblemBank {
  private problems: Problem[]

  constructor() {
    const filePath = path.join(__dirname, '../../src/challenge/problems.json')
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const data = require(filePath) as ProblemsFile
    this.problems = data.problems
  }

  getRandomProblem(): Problem {
    const idx = Math.floor(Math.random() * this.problems.length)
    return this.problems[idx]
  }

  getProblemById(id: string): Problem | null {
    return this.problems.find((p) => p.id === id) ?? null
  }

  getByDifficulty(difficulty: 'Easy' | 'Medium' | 'Hard'): Problem[] {
    return this.problems.filter((p) => p.difficulty === difficulty)
  }

  count(): number {
    return this.problems.length
  }
}
