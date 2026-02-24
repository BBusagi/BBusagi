# DotaWatchdog — AGENTS.md

> 本文档为 Claude Code / Vibe Coding 自动开发参考规范。所有模块开发应严格遵循本文档的架构和接口定义。

---

## 1. 项目概述

### 1.1 产品定义

一个 Windows 桌面自律工具（Electron 应用），在启动 Dota 2 之前强制用户完成三道关卡，防止冲动开局。

### 1.2 三道解锁条件

| 条件 | 描述 | 实现机制 |
|------|------|---------|
| 冷却计时 | 启动 app 后需等待 20 分钟 | 时间戳写入磁盘，重启 app 不重置 |
| 算法题 | 随机抽一道算法题，需提交代码 + 解释 | 本地题库 JSON + OpenAI GPT-4o-mini AI 验证 |
| Follow-up | 若题目为 Easy/Simple，追加一道深入问题 | OpenAI GPT-4o-mini 在验证时同步生成 follow-up |

### 1.3 技术原则

- **进程拦截而非文件修改**：通过 tasklist 轮询 + taskkill 阻止 dota2.exe，不修改游戏文件，不触发 VAC
- **AI 验证而非 LeetCode API**：LeetCode 无官方 SDK，非官方 GraphQL 需要 session cookie 维护成本高；直接用 OpenAI GPT-4o-mini 验证代码正确性和解释质量
- **本地题库**：60 道精选算法题存入 problems.json，完全离线，稳定可用
- **防绕过设计**：冷却时间戳持久化到磁盘，重启 app 恢复剩余时间，不可通过重启规避

---

## 2. 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                  Renderer (React + Vite)                 │
│   CooldownView / ChallengeView / FollowUpView / ...      │
└──────────────────────┬──────────────────────────────────┘
                       │ IPC (push:/req:/res: 命名规范)
┌──────────────────────▼──────────────────────────────────┐
│                  Main Process (Electron)                  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │           WatchdogStateMachine (核心)             │   │
│  │   LOCKED → COOLDOWN → CHALLENGE → UNLOCKED       │   │
│  │                              ↘ FOLLOW_UP ↗        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ProcessMonitor│  │CooldownTimer │  │   Verifier    │  │
│  │tasklist 轮询  │  │磁盘持久化    │  │ OpenAI API    │  │
│  │taskkill 拦截  │  │20min 计时    │  │ JSON 结构化   │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐                     │
│  │ SettingsStore│  │ ProblemBank  │                     │
│  │ electron-store│  │problems.json│                     │
│  │ safeStorage  │  │ 60 道题库    │                     │
│  └──────────────┘  └──────────────┘                     │
└─────────────────────────────────────────────────────────┘
```

---

## 3. 状态机设计

### 3.1 状态定义

```typescript
type WatchdogState =
  | 'LOCKED'     // app 刚启动，立刻转入 COOLDOWN
  | 'COOLDOWN'   // 20min 倒计时，dota2 进程被秒杀
  | 'CHALLENGE'  // 等待用户提交代码 + 解释
  | 'FOLLOW_UP'  // Easy 题通过后的追加问题环节
  | 'UNLOCKED'   // 三关全过，当天有效，dota2 可正常启动
  | 'SETTINGS'   // 设置界面（不影响锁定状态）
```

### 3.2 状态转移

```
LOCKED     → COOLDOWN    on: app 启动，写入冷却时间戳
COOLDOWN   → CHALLENGE   on: 冷却时间到期
CHALLENGE  → FOLLOW_UP   on: OpenAI GPT-4o-mini 验证通过 + difficulty == Easy/Simple
CHALLENGE  → UNLOCKED    on: OpenAI GPT-4o-mini 验证通过 + difficulty == Medium/Hard
FOLLOW_UP  → UNLOCKED    on: OpenAI GPT-4o-mini 验证 follow-up 通过
UNLOCKED   → LOCKED      on: 手动 Re-lock 或次日首次启动（sessionDate 不匹配）
```

### 3.3 Context 数据结构

```typescript
interface WatchdogContext {
  state: WatchdogState;
  cooldownStartedAt: number | null;   // Unix ms，写入磁盘
  cooldownDurationMs: number;          // 默认 20 * 60 * 1000
  currentProblem: Problem | null;
  followUpQuestion: string | null;
  unlockedAt: number | null;
  sessionDate: string;                 // "YYYY-MM-DD"，每日重置
}
```

---

## 4. 进程拦截模块

### 4.1 文件路径
`src/blocker/process-monitor.ts`

### 4.2 设计要点

- 使用 `setInterval` 每 2 秒执行一次 `tasklist` 检查
- 目标进程：`dota2.exe`、`dota2launcher.exe`
- 若 `stateMachine.isBlocking()` 为 true 且进程存在，执行 `taskkill /F /IM`
- 调用 `node-notifier` 弹出 Windows toast，说明当前阻止原因
- app 以管理员权限运行（electron-builder manifest 设置 `requireAdministrator`）

### 4.3 核心接口

```typescript
class ProcessMonitor {
  constructor(stateMachine: WatchdogStateMachine)
  start(): void
  stop(): void
  private tick(): void
  private isRunning(processName: string): boolean
  private kill(processName: string): void
}
```

---

## 5. 冷却计时器

### 5.1 文件路径
`src/cooldown/cooldown-timer.ts`

### 5.2 设计要点

- 冷却开始时刻以 Unix ms 写入 `userData/cooldown-state.json`
- app 重启时读取文件：若剩余时间 > 0，恢复倒计时；若已过期，直接触发 `onExpired`
- 提供 `getRemainingMs()` 和 `getProgressPercent()` 供 UI 使用
- 每秒向 Renderer 推送 `push:cooldown_tick`

---

## 6. 算法题库

### 6.1 文件路径
`src/challenge/problems.json`

### 6.2 题目 JSON 结构

```typescript
interface Problem {
  id: string                      // e.g. "94-binary-tree-inorder-traversal"
  leetcode_id?: number            // LeetCode 题号
  title: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  tags: string[]
  description: string             // 题目描述（含示例）
  constraints: string[]
  expected_concepts: string[]     // 传给 GPT 作为评估参考
  follow_up_override?: string     // 预定义的追加问题（优先于 GPT 生成）
}
```

### 6.3 题库来源

题库完全来自用户实际做过的 LeetCode 题目，共 50 道，按练习日志整理：

#### 树与图（14 道）
| # | 题目 | 难度 | 追加问题 |
|---|------|------|---------|
| 94 | Binary Tree Inorder Traversal | Easy | — |
| 144 | Binary Tree Preorder Traversal | Easy | — |
| 145 | Binary Tree Postorder Traversal | Easy | **迭代实现** |
| 102 | Binary Tree Level Order Traversal | Medium | — |
| 429 | N-ary Tree Level Order Traversal | Medium | — |
| 589 | N-ary Tree Preorder Traversal | Easy | — |
| 590 | N-ary Tree Postorder Traversal | Easy | **迭代实现** |
| 111 | Minimum Depth of Binary Tree | Easy | — |
| 797 | All Paths From Source to Target | Medium | **BFS 实现** |

#### 链表（16 道）
| # | 题目 | 难度 | 追加问题 |
|---|------|------|---------|
| 21 | Merge Two Sorted Lists | Easy | — |
| 86 | Partition List | Medium | — |
| 23 | Merge k Sorted Lists | Hard | **改为最大值** |
| 19 | Remove Nth Node From End | Medium | — |
| 876 | Middle of the Linked List | Easy | **返回第一个中间节点** |
| 141 | Linked List Cycle | Easy | — |
| 142 | Linked List Cycle II | Medium | — |
| 160 | Intersection of Two Linked Lists | Easy | — |
| 82 | Remove Duplicates from Sorted List II | Medium | — |
| 83 | Remove Duplicates from Sorted List | Easy | — |
| 2 | Add Two Numbers | Medium | — |
| 445 | Add Two Numbers II | Medium | — |
| 234 | Palindrome Linked List | Easy | **O(n) 时间 O(1) 空间** |
| 206 | Reverse Linked List | Easy | — |

#### 堆 / 优先队列（2 道）
| # | 题目 | 难度 | 追加问题 |
|---|------|------|---------|
| 378 | Kth Smallest Element in Sorted Matrix | Medium | — |
| 373 | Find K Pairs with Smallest Sums | Medium | — |

#### 基础数学 / 数组（14 道）
| # | 题目 | 难度 | 追加问题 |
|---|------|------|---------|
| 9 | Palindrome Number | Easy | — |
| 13 | Roman to Integer | Easy | — |
| 66 | Plus One | Easy | — |
| 766 | Toeplitz Matrix | Easy | — |
| 1295 | Find Numbers with Even Number of Digits | Easy | — |
| 1394 | Find Lucky Integer in an Array | Easy | — |
| 1450 | Number of Students Doing Homework | Easy | — |
| 1470 | Shuffle the Array | Easy | — |
| 1480 | Running Sum of 1d Array | Easy | — |
| 1952 | Three Divisors | Easy | — |
| 3024 | Type of Triangle | Easy | — |
| 3028 | Ant on the Boundary | Easy | — |
| 3099 | Harshad Number | Easy | — |

#### 滑动窗口 / 二分（3 道）
| # | 题目 | 难度 | 追加问题 |
|---|------|------|---------|
| 424 | Longest Repeating Character Replacement | Medium | — |
| 1004 | Max Consecutive Ones III | Medium | — |
| 1482 | Min Days to Make m Bouquets | Medium | — |

#### 贪心 / 哈希（2 道）
| # | 题目 | 难度 | 追加问题 |
|---|------|------|---------|
| 954 | Array of Doubled Pairs | Medium | — |
| 1390 | Four Divisors | Medium | — |

#### 周赛题（7 道）
| # | 题目 | 难度 | 追加问题 |
|---|------|------|---------|
| 2553 | Separate the Digits in an Array | Easy | — |
| 2554 | Maximum Number of Integers to Choose | Medium | — |
| 2555 | Maximize Win From Two Segments | Medium | — |
| 2556 | Disconnect Path in Binary Matrix | Hard | — |
| 2869 | Minimum Operations to Collect Elements | Easy | — |
| 2870 | Min Operations to Make Array Empty | Medium | — |
| 2871 | Split Array Into Max Subarrays | Medium | — |

### 6.4 follow_up_override 机制

带有 `follow_up_override` 字段的题目（共 5 道），在验证通过后会强制使用预定义的追加问题，而非让 GPT 自动生成。这些是用户曾经特别思考过的 follow-up：

- **145**：不用递归如何迭代实现后序遍历？
- **590**：Recursive solution is trivial, could you do it iteratively?
- **797**：BFS 实现路径搜索，如何追踪完整路径？
- **876**：返回第一个中间节点时快慢指针终止条件如何修改？
- **23**：如果要求按最大值合并怎么实现？
- **234**：O(n) 时间 O(1) 空间的原地回文检测

### 6.5 ProblemBank 接口
`src/challenge/problem-bank.ts`

```typescript
class ProblemBank {
  getRandomProblem(): Problem
  getProblemById(id: string): Problem | null
  getByDifficulty(difficulty: 'Easy' | 'Medium' | 'Hard'): Problem[]
  count(): number
}
```

---

## 7. AI 验证模块

### 7.1 文件路径
`src/ai/verifier.ts`、`src/ai/prompts.ts`

### 7.2 接口定义

```typescript
interface VerificationResult {
  correct: boolean;
  explanation_quality: 'good' | 'partial' | 'poor';
  difficulty_confirmed: 'Easy' | 'Simple' | 'Medium' | 'Hard';
  feedback: string;              // 1-3 句反馈，显示给用户
  follow_up_question?: string;   // 仅 difficulty 为 Easy/Simple 时存在
}

class Verifier {
  constructor(apiKey: string)
  verifySolution(problem: Problem, code: string, explanation: string): Promise<VerificationResult>
  verifyFollowUp(problem: Problem, question: string, explanation: string): Promise<{ acceptable: boolean; feedback: string }>
}
```

### 7.3 解锁条件

- `verifySolution`：`correct == true` AND `explanation_quality` 为 `good` 或 `partial`
- `verifyFollowUp`：`acceptable == true`
- 任何条件不满足：显示 `feedback`，同一道题允许无限次重试

### 7.4 System Prompt（verifySolution）

```
你是一个严格但公平的算法面试评估官。
给定一道算法题、用户的代码解法和解释，你需要同时评估：
1. 代码是否正确（处理边界条件、时间/空间复杂度可接受）
2. 解释是否体现了真正的理解（数据结构选择原因、时间/空间复杂度分析）

规则：
- 暴力 O(n²) 解法可接受，但用户必须说明复杂度并知晓其局限性
- 代码正确但解释含糊 → 不通过
- 必须使用 JSON 格式回复，不包含任何其他文字

返回格式：
{
  "correct": boolean,
  "explanation_quality": "good" | "partial" | "poor",
  "difficulty_confirmed": "Easy" | "Simple" | "Medium" | "Hard",
  "feedback": "1-3句中文反馈",
  "follow_up_question": "string | null（仅 difficulty 为 Easy 或 Simple 且 correct 为 true 时填写）"
}

follow_up_question 应为同一题的深化问题，例如：
- "如何修改以支持重复元素？"
- "能否优化到 O(n log n)？请解释 tradeoff。"
```

### 7.5 JSON 解析容错

```typescript
// 优先直接 JSON.parse
// 失败则 regex 提取：response.match(/\{[\s\S]+\}/)
// 两者均失败：返回 { correct: false, feedback: "验证服务出现错误，请重试。" }
// 永远不会因解析失败而意外解锁
```

---

## 8. IPC 通信协议

命名规范与 DotaAI 一致：`push:` 主动推送，`req:` Renderer 请求，`res:` 主进程响应。

| Channel | 方向 | 触发时机 | Payload |
|---------|------|---------|---------|
| `push:state_changed` | main → renderer | 状态机转移 | `WatchdogContext` |
| `push:cooldown_tick` | main → renderer | 每秒，冷却中 | `{ remainingMs, progressPercent }` |
| `push:verification_result` | main → renderer | OpenAI GPT-4o-mini 响应后 | `VerificationResult` |
| `push:dota_blocked` | main → renderer | 进程被杀死时 | `{ processName }` |
| `req:get_state` | renderer → main | UI 初始化 | — |
| `res:get_state` | main → renderer | — | `WatchdogContext` |
| `req:submit_solution` | renderer → main | 用户提交代码 | `{ code, explanation }` |
| `req:submit_follow_up` | renderer → main | 用户提交追加回答 | `{ explanation }` |
| `req:get_settings` | renderer → main | 进入设置页 | — |
| `res:get_settings` | main → renderer | — | `AppSettings` |
| `req:save_settings` | renderer → main | 用户保存设置 | `{ anthropicApiKey, cooldownMinutes }` |
| `req:relock` | renderer → main | 用户点击 Re-lock | — |

---

## 9. 设置存储

### 9.1 文件路径
`src/main/settings-store.ts`

### 9.2 数据结构

```typescript
interface AppSettings {
  anthropicApiKey: string;        // 用 safeStorage 加密存储
  cooldownMinutes: number;        // 默认 20
  autoStartWithWindows: boolean;  // 默认 true
}
```

### 9.3 注意事项

- API Key 使用 `safeStorage.encryptString()` / `safeStorage.decryptString()` 加密
- 使用 `electron-store` 管理持久化，不手动读写文件
- `autoStartWithWindows` 通过 `app.setLoginItemSettings()` 实现

---

## 10. 项目文件结构

```
DotaWatchdog/
├── AGENTS.md
├── README.md
├── package.json
├── tsconfig.json
├── tsconfig.main.json
├── vite.config.ts
├── electron-builder.json
├── tailwind.config.js
├── assets/
│   ├── icon-locked.ico
│   └── icon-unlocked.ico
└── src/
    ├── main/
    │   ├── index.ts
    │   ├── tray.ts
    │   ├── ipc-handler.ts
    │   └── settings-store.ts
    ├── core/
    │   ├── watchdog-state-machine.ts
    │   └── event-bus.ts
    ├── blocker/
    │   └── process-monitor.ts
    ├── cooldown/
    │   └── cooldown-timer.ts
    ├── challenge/
    │   ├── problem-bank.ts
    │   └── problems.json
    ├── ai/
    │   ├── verifier.ts
    │   └── prompts.ts
    └── ui/
        ├── App.tsx
        ├── index.tsx
        ├── preload.ts
        ├── views/
        │   ├── CooldownView.tsx
        │   ├── ChallengeView.tsx
        │   ├── FollowUpView.tsx
        │   ├── UnlockedView.tsx
        │   └── SettingsView.tsx
        ├── components/
        │   ├── CountdownRing.tsx
        │   ├── CodeEditor.tsx
        │   ├── ProblemCard.tsx
        │   └── StatusBanner.tsx
        ├── hooks/
        │   └── useIpc.ts
        └── store/
            └── watchdog-store.ts
```

---

## 11. 依赖清单

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.30.0",
    "electron-store": "^8.2.0",
    "node-notifier": "^10.0.1",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@monaco-editor/react": "^4.6.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "electron": "^31.0.0",
    "electron-builder": "^24.13.0",
    "typescript": "^5.4.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "concurrently": "^8.2.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@types/node": "^20.0.0",
    "@types/node-notifier": "^8.0.0"
  }
}
```

---

## 12. 打包配置要点

`electron-builder.json` 关键配置：

```json
{
  "win": {
    "requestedExecutionLevel": "requireAdministrator"
  }
}
```

`requireAdministrator` 是让 `taskkill /F` 能可靠终止 Steam 启动的 dota2.exe 的关键，Steam 本身通常以中等完整性级别运行。

---

## 13. 开发阶段规划

### Phase 1 — 骨架 + 拦截器
目标：启动 app → 打开 dota2 → 被杀死 + toast 通知

- [ ] 项目初始化（package.json / tsconfig / vite.config）
- [ ] WatchdogStateMachine（LOCKED / COOLDOWN）
- [ ] CooldownTimer（磁盘持久化）
- [ ] ProcessMonitor（tasklist + taskkill）
- [ ] Electron main process 主流程
- [ ] CooldownView UI

### Phase 2 — 算法挑战流程
目标：完整三步解锁 end-to-end

- [ ] problems.json（先放 20 道 Easy/Medium 题）
- [ ] ProblemBank（随机抽题）
- [ ] Verifier（OpenAI GPT-4o-mini API + JSON 解析）
- [ ] ChallengeView + FollowUpView + UnlockedView
- [ ] CHALLENGE / FOLLOW_UP / UNLOCKED 状态转移

### Phase 3 — 打磨 + 设置
- [ ] SettingsView（API key 输入 + 验证测试）
- [ ] safeStorage 加密存储
- [ ] 托盘图标状态切换
- [ ] Windows 开机自启

### Phase 4 — 打包
- [ ] requestedExecutionLevel manifest
- [ ] electron-builder NSIS 安装包
- [ ] 打包验收测试
