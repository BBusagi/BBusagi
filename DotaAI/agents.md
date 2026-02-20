# Dota 2 AI Coach — AGENTS.md

> 本文档为 Claude Code / Vibe Coding 自动开发参考规范。所有模块开发应严格遵循本文档的架构和接口定义。

---

## 1. 项目概述

### 1.1 产品定义

一个基于 AI 的 Dota 2 战略助教应用，通过分析玩家数据、阵容搭配、实时游戏状态，为玩家提供阶段性策略建议（非实时操作层面）。

### 1.2 核心场景

| 阶段 | 功能 | 输入 | 输出 |
|------|------|------|------|
| 赛前（Ban/Pick） | 英雄推荐 & 阵容分析 | 双方已选英雄、玩家历史数据 | 推荐英雄、阵容评估、Ban 建议 |
| 对线期（0-10min） | 对线策略 | GSI 数据（等级/金钱/击杀） | 对线风格建议（压制/发育/换线） |
| 中期（10-25min） | 节奏控制 | GSI 数据 + 经济曲线 + 地图事件 | 抱团/分带/打肉山时机建议 |
| 后期（25min+） | 决策建议 | 团队经济差、装备进度、地图控制 | 团战/守高/分推/买活策略 |

### 1.3 技术原则

- **数据驱动为主，人工调优为辅**：策略知识从近 2-3 周高段位比赛数据中自动挖掘
- **非侵入式**：仅使用 Valve 官方 GSI 接口和公开 API，不读取游戏内存
- **分层架构**：数据层、分析层、AI 推理层、展示层解耦

---

## 2. 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Electron)                   │
│              Overlay UI / 独立窗口建议面板               │
└──────────────────────┬──────────────────────────────────┘
                       │ WebSocket / IPC
┌──────────────────────▼──────────────────────────────────┐
│                   Backend Server (Node.js)               │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │  GSI 接收器  │  │  数据分析引擎 │  │  AI 推理层     │ │
│  │  (HTTP)     │  │  (统计/规则)  │  │  (Claude API)  │ │
│  └──────┬──────┘  └──────┬───────┘  └───────┬────────┘ │
│         │                │                   │          │
│  ┌──────▼────────────────▼───────────────────▼────────┐ │
│  │              数据存储层 (SQLite / Redis)             │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   OpenDota API    Stratz API    Steam Web API
```

---

## 3. 模块详细设计

### 3.1 数据采集模块 (`/src/data/`)

#### 3.1.1 GSI 接收器 (`gsi-server.ts`)

Valve Game State Integration — 游戏实时推送数据到本地 HTTP 服务器。

**职责：**
- 在本地启动 HTTP 服务器（默认端口 `3001`）
- 接收 Dota 2 客户端推送的 JSON 数据
- 解析并发射事件供其他模块消费

**GSI 配置文件：** 放置于 `Steam/steamapps/common/dota 2 beta/game/dota/cfg/gamestate_integration_coach.cfg`

```
"dota2-gsi"
{
    "uri"           "http://localhost:3001/gsi"
    "timeout"       "5.0"
    "buffer"        "0.5"
    "throttle"      "1.0"
    "heartbeat"     "30.0"
    "data"
    {
        "buildings"     "1"
        "provider"      "1"
        "map"           "1"
        "player"        "1"
        "hero"          "1"
        "abilities"     "1"
        "items"         "1"
        "draft"         "1"
        "wearables"     "0"
    }
}
```

**输出事件：**

```typescript
interface GSIEvent {
  type: 'draft_update' | 'game_state' | 'hero_update' | 'item_update';
  timestamp: number;
  data: GSIPayload;
}

interface GSIPayload {
  map?: {
    matchid: string;
    game_time: number;
    clock_time: number;
    daytime: boolean;
    game_state: 'DOTA_GAMERULES_STATE_HERO_SELECTION' | 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' | 'DOTA_GAMERULES_STATE_POST_GAME';
    win_team: string;
    roshan_state: 'alive' | 'dead' | 'unknown';
    roshan_state_end_seconds?: number;
  };
  player?: {
    steamid: string;
    team_name: string;
    gold: number;
    gold_reliable: number;
    gold_unreliable: number;
    gpm: number;
    xpm: number;
    level: number;
    kills: number;
    deaths: number;
    assists: number;
    last_hits: number;
    denies: number;
  };
  hero?: {
    id: number;
    name: string;
    level: number;
    alive: boolean;
    respawn_seconds: number;
    buyback_cost: number;
    buyback_cooldown: number;
    health: number;
    max_health: number;
    health_percent: number;
    mana: number;
    max_mana: number;
    mana_percent: number;
  };
  items?: Record<string, { name: string; purchaser?: number; }>;
  draft?: {
    activeteam: number;
    pick: boolean;
    activeteam_time_remaining: number;
    radiant_bonus_time: number;
    dire_bonus_time: number;
    team2?: DraftTeam;  // radiant
    team3?: DraftTeam;  // dire
  };
}

interface DraftTeam {
  [key: string]: {  // pick0_id, pick1_id, ban0_id, etc.
    [prop: string]: number | boolean;
  };
}
```

#### 3.1.2 历史数据采集器 (`data-fetcher.ts`)

**职责：**
- 定期从 OpenDota / Stratz API 拉取近 2-3 周高段位（Divine+ / Immortal）比赛数据
- 存储到本地数据库用于统计分析
- 拉取当前玩家的个人历史数据

**API 端点：**

```typescript
// OpenDota API
const OPENDOTA_BASE = 'https://api.opendota.com/api';

// 关键接口
GET /heroStats                          // 英雄全局统计
GET /heroes/{hero_id}/matchups          // 英雄克制数据
GET /heroes/{hero_id}/durations         // 英雄胜率-时间曲线
GET /players/{account_id}               // 玩家基本信息
GET /players/{account_id}/heroes        // 玩家英雄池
GET /players/{account_id}/recentMatches // 最近比赛
GET /players/{account_id}/peers         // 常一起玩的人
GET /publicMatches?min_rank=80          // 高段位公开比赛 (80 = Divine+)
GET /parsedMatches                      // 已解析的比赛（含详细数据）

// Stratz API (GraphQL)
const STRATZ_BASE = 'https://api.stratz.com/graphql';
// 用于补充 OpenDota 没有的数据，如对线数据、团战分析等
```

**数据刷新策略：**

```typescript
interface DataRefreshConfig {
  // 全局统计数据：每天更新一次
  globalStats: { interval: '24h', source: 'opendota' };
  // 英雄克制数据：每天更新一次
  heroMatchups: { interval: '24h', source: 'opendota' };
  // 高段位比赛采样：每6小时拉取最新
  highRankMatches: { interval: '6h', source: 'opendota', filter: 'min_rank=80&date=21' };
  // 当前玩家数据：每次启动应用时更新
  playerData: { trigger: 'on_app_start', source: 'opendota' };
}
```

---

### 3.2 数据分析引擎 (`/src/analysis/`)

> 核心：纯数据驱动，从统计中自动提取策略规律

#### 3.2.1 英雄分析器 (`hero-analyzer.ts`)

**职责：** 从近期数据自动计算英雄关系和趋势

```typescript
interface HeroAnalysis {
  // 自动计算的英雄克制矩阵
  // 从高段位近2-3周比赛数据统计
  matchupMatrix: Map<HeroId, Map<HeroId, {
    winRate: number;       // A vs B 的胜率
    sampleSize: number;    // 样本量
    confidence: number;    // 置信度 (基于样本量)
    laneWinRate?: number;  // 对线阶段胜率
  }>>;

  // 英雄胜率-游戏时长曲线
  // 自动识别英雄的强势/弱势时间段
  durationCurves: Map<HeroId, {
    timeSlots: Array<{
      minute: number;       // 时间点 (0, 10, 20, 30, 40, 50, 60)
      winRate: number;
      sampleSize: number;
    }>;
    peakTiming: number;     // 胜率最高的时间段
    falloffTiming: number;  // 胜率开始下降的时间段
    archetype: 'early' | 'mid' | 'late' | 'flat'; // 自动分类
  }>;

  // 英雄阵容搭配胜率
  synergyMatrix: Map<HeroPair, {
    combinedWinRate: number;  // 同队时胜率
    sampleSize: number;
  }>;

  // 当前版本 Meta 分析
  // 从近期胜率变化自动检测
  metaTrends: Array<{
    heroId: HeroId;
    pickRate: number;
    banRate: number;
    winRate: number;
    winRateChange: number;  // 相比上一周的变化
    trending: 'rising' | 'falling' | 'stable';
  }>;
}
```

#### 3.2.2 阵容分析器 (`draft-analyzer.ts`)

**职责：** 评估阵容强弱和推荐英雄

```typescript
interface DraftAnalysis {
  // 输入：当前已选英雄
  analyze(
    radiantPicks: HeroId[],
    direPicks: HeroId[],
    playerHeroPool?: PlayerHeroStats  // 可选：玩家擅长英雄
  ): DraftResult;
}

interface DraftResult {
  // 阵容评分 (0-100)
  radiantScore: number;
  direScore: number;

  // 阵容特征 (自动识别)
  radiantTraits: CompositionTraits;
  direTraits: CompositionTraits;

  // 推荐英雄 (基于统计最优 + 玩家英雄池交集)
  recommendations: Array<{
    heroId: HeroId;
    reason: string;          // 自动生成的推荐理由
    expectedWinRate: number;  // 预期胜率
    playerComfort: number;    // 玩家熟练度 (0-1)
    compositeScore: number;   // 综合推荐分
  }>;

  // 阵容胜率-时间预测
  timingAdvantage: {
    earlyGame: 'radiant' | 'dire' | 'even';
    midGame: 'radiant' | 'dire' | 'even';
    lateGame: 'radiant' | 'dire' | 'even';
    optimalGameLength: number;  // 己方最佳游戏时长
  };
}

interface CompositionTraits {
  pushPower: number;      // 推进能力 (0-1)
  teamfightPower: number; // 团战能力 (0-1)
  splitPushPower: number; // 分推能力 (0-1)
  pickOffPower: number;   // 抓人能力 (0-1)
  latePotential: number;  // 后期潜力 (0-1)
  laneDominance: number;  // 对线强度 (0-1)
}
```

#### 3.2.3 实时局势分析器 (`game-analyzer.ts`)

**职责：** 基于 GSI 数据判断当前局势，生成分析快照

```typescript
interface GameSnapshot {
  gameTime: number;
  phase: 'laning' | 'mid_game' | 'late_game';

  // 经济分析 (自动)
  economy: {
    teamGoldAdvantage: number;      // 正 = 己方领先
    teamXPAdvantage: number;
    netWorthLead: number;
    farmDistribution: 'balanced' | 'core_heavy' | 'support_heavy';
  };

  // 节奏指标 (自动)
  tempo: {
    killsPerMinute: number;
    towersTaken: { radiant: number; dire: number };
    roshanStatus: 'alive' | 'dead_recently' | 'spawning_soon';
    roshanEstimatedSpawn?: number;  // 预计刷新时间
  };

  // 关键事件检测 (自动)
  events: Array<{
    type: 'power_spike' | 'key_item' | 'roshan_window' | 'timing_warning';
    message: string;
    priority: 'high' | 'medium' | 'low';
  }>;

  // 局势评估 (自动)
  assessment: {
    advantage: 'winning' | 'slightly_ahead' | 'even' | 'slightly_behind' | 'losing';
    momentum: 'gaining' | 'stable' | 'losing';
    urgency: number;  // 0-1, 越高表示越需要立即行动
  };
}
```

#### 3.2.4 玩家风格分析器 (`player-analyzer.ts`)

**职责：** 从历史数据自动识别玩家风格

```typescript
interface PlayerProfile {
  steamId: string;

  // 自动识别的玩家风格
  playstyle: {
    aggression: number;      // 0-1 (被动-激进)
    farmFocus: number;       // 0-1 (打架-刷钱)
    earlyGameImpact: number; // 前期参与度
    versatility: number;     // 英雄池广度
    consistency: number;     // 表现稳定性
  };

  // 英雄池分析
  heroPool: Array<{
    heroId: HeroId;
    games: number;
    winRate: number;
    comfort: number;        // 综合熟练度
    recentPerformance: number; // 近期表现趋势
  }>;

  // 位置偏好
  rolePreference: {
    carry: number;
    mid: number;
    offlane: number;
    softSupport: number;
    hardSupport: number;
  };
}
```

---

### 3.3 AI 推理层 (`/src/ai/`)

#### 3.3.1 建议生成器 (`advisor.ts`)

**职责：** 将分析结果 + 上下文发送给 Claude API，生成自然语言建议

```typescript
interface AdvisorConfig {
  model: 'claude-sonnet-4-5-20250929';  // 推荐 Sonnet：性价比最优
  maxTokens: 1024;
  temperature: 0.3;  // 偏低，保证建议稳定性
}

class Advisor {
  // 赛前建议
  async getDraftAdvice(
    draft: DraftResult,
    playerProfile: PlayerProfile
  ): Promise<string>;

  // 游戏中阶段性建议
  async getGameAdvice(
    snapshot: GameSnapshot,
    draftResult: DraftResult,
    playerProfile: PlayerProfile,
    previousAdvice?: string[]  // 避免重复建议
  ): Promise<string>;

  // 关键时刻提醒
  async getAlertAdvice(
    event: GameEvent,
    context: GameSnapshot
  ): Promise<string>;
}
```

**Prompt 设计原则：**

```typescript
// System Prompt 结构
const SYSTEM_PROMPT = `
你是一个专业的 Dota 2 教练 AI。你的建议基于统计数据和比赛分析。

规则：
1. 建议简洁明了，每次不超过 3 条核心建议
2. 优先级排序：最重要的建议放在最前面
3. 给出具体可执行的行动，而不是笼统的建议
4. 考虑玩家的水平和英雄池
5. 适当解释原因（"因为对面阵容后期更强，所以..."）
6. 注意时间敏感的建议（肉山、关键道具节点）

输出格式：
- 使用中文
- 每条建议一行
- 标注优先级 [高/中/低]
`;

// 游戏中 User Prompt 模板
const GAME_PROMPT_TEMPLATE = `
当前游戏状态：
- 时间: {gameTime}
- 阶段: {phase}
- 己方英雄: {allyHeroes}
- 对方英雄: {enemyHeroes}
- 经济优势: {goldAdvantage}
- 经验优势: {xpAdvantage}

阵容分析：
- 己方阵容特征: {allyTraits}
- 对方阵容特征: {enemyTraits}
- 最佳游戏时长: {optimalGameLength}

关键事件：
{events}

统计数据参考：
{relevantStats}

玩家风格: {playerStyle}

请给出当前阶段最重要的 2-3 条策略建议。
`;
```

**API 调用频率控制：**

```typescript
interface AdvisorThrottleConfig {
  // 赛前阶段：每次 pick/ban 变化时调用
  draftPhase: { trigger: 'on_change' };
  // 对线期：每 2 分钟最多一次
  laningPhase: { minInterval: 120_000 };
  // 中期：每 3 分钟或关键事件触发
  midGame: { minInterval: 180_000, triggerOnEvent: true };
  // 后期：每 2 分钟或关键事件触发
  lateGame: { minInterval: 120_000, triggerOnEvent: true };
  // 关键事件（肉山/团灭等）：立即触发
  criticalEvent: { immediate: true };
}
```

---

### 3.4 数据存储 (`/src/db/`)

#### 3.4.1 数据库 Schema (`schema.sql`)

```sql
-- 英雄基础数据
CREATE TABLE heroes (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  localized_name TEXT NOT NULL,
  primary_attr TEXT,       -- str / agi / int / uni
  attack_type TEXT,        -- melee / ranged
  roles TEXT               -- JSON array: ["Carry", "Support", ...]
);

-- 英雄克制矩阵（自动计算，定期刷新）
CREATE TABLE hero_matchups (
  hero_id INTEGER,
  against_hero_id INTEGER,
  win_rate REAL,
  sample_size INTEGER,
  lane_win_rate REAL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (hero_id, against_hero_id)
);

-- 英雄搭配矩阵
CREATE TABLE hero_synergies (
  hero_id_1 INTEGER,
  hero_id_2 INTEGER,
  combined_win_rate REAL,
  sample_size INTEGER,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (hero_id_1, hero_id_2)
);

-- 英雄胜率-时长曲线
CREATE TABLE hero_duration_curves (
  hero_id INTEGER,
  minute_bucket INTEGER,    -- 0, 10, 20, 30, 40, 50, 60
  win_rate REAL,
  sample_size INTEGER,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (hero_id, minute_bucket)
);

-- 当前版本 Meta 统计
CREATE TABLE meta_stats (
  hero_id INTEGER PRIMARY KEY,
  pick_rate REAL,
  ban_rate REAL,
  win_rate REAL,
  win_rate_prev_week REAL,
  trending TEXT,            -- rising / falling / stable
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 玩家缓存数据
CREATE TABLE player_cache (
  steam_id TEXT PRIMARY KEY,
  profile_json TEXT,        -- 完整 PlayerProfile JSON
  hero_pool_json TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 比赛历史（用于数据分析）
CREATE TABLE match_samples (
  match_id BIGINT PRIMARY KEY,
  avg_rank INTEGER,
  duration INTEGER,
  radiant_win BOOLEAN,
  radiant_heroes TEXT,      -- JSON array of hero IDs
  dire_heroes TEXT,
  radiant_gold_adv TEXT,    -- JSON array: 每分钟金钱优势
  parsed_data TEXT,         -- 详细解析数据 JSON
  start_time DATETIME,
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 人工调优规则（辅助）
CREATE TABLE manual_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_type TEXT,           -- 'override' | 'boost' | 'suppress'
  condition_json TEXT,      -- 触发条件
  action_json TEXT,         -- 执行动作
  reason TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### 3.5 前端展示层 (`/src/ui/`)

#### 3.5.1 技术选型

- **框架：** Electron + React + TypeScript
- **样式：** Tailwind CSS
- **状态管理：** Zustand（轻量）
- **通信：** WebSocket（后端 → 前端实时推送建议）

#### 3.5.2 页面结构

```
App
├── DraftView         # 赛前选人阶段
│   ├── HeroGrid      # 英雄池展示 + 推荐高亮
│   ├── MatchupPanel   # 克制关系展示
│   ├── DraftTimeline  # Ban/Pick 进度
│   └── AdvicePanel    # AI 建议区域
│
├── GameView          # 游戏中
│   ├── StatusBar      # 经济/经验/时间概览
│   ├── TimingAlert    # 关键时间点提醒 (肉山/道具节点)
│   ├── AdvicePanel    # AI 策略建议（主区域）
│   └── MiniAnalysis   # 简要局势评估
│
├── PostGameView      # 赛后
│   ├── MatchSummary   # 比赛总结
│   └── ImproveTips    # 改进建议
│
└── SettingsView      # 设置
    ├── APIKeys        # OpenDota / Stratz / Claude API 配置
    ├── PlayerLink     # Steam 账号绑定
    ├── Preferences    # 建议频率、语言、段位偏好
    └── ManualRules    # 人工规则管理界面
```

#### 3.5.3 Overlay 模式

支持游戏内悬浮窗模式（Electron `setAlwaysOnTop + transparent window`），显示关键建议，不遮挡游戏画面。

```typescript
// Electron overlay 窗口配置
const overlayWindow = new BrowserWindow({
  width: 400,
  height: 300,
  transparent: true,
  frame: false,
  alwaysOnTop: true,
  skipTaskbar: true,
  focusable: false,          // 不抢游戏焦点
  webPreferences: {
    nodeIntegration: true,
  },
});

// 定位到屏幕右上角
overlayWindow.setPosition(screenWidth - 420, 20);
```

---

## 4. 项目结构

```
dota2-coach/
├── AGENTS.md                    # 本文档
├── package.json
├── tsconfig.json
├── electron-builder.json
│
├── src/
│   ├── main/                    # Electron 主进程
│   │   ├── index.ts
│   │   ├── overlay.ts           # Overlay 窗口管理
│   │   └── tray.ts              # 系统托盘
│   │
│   ├── data/                    # 数据采集模块
│   │   ├── gsi-server.ts        # GSI HTTP 服务器
│   │   ├── data-fetcher.ts      # OpenDota/Stratz API 数据拉取
│   │   ├── data-refresh.ts      # 定时刷新调度器
│   │   └── types.ts             # 数据类型定义
│   │
│   ├── analysis/                # 数据分析引擎
│   │   ├── hero-analyzer.ts     # 英雄统计分析
│   │   ├── draft-analyzer.ts    # 阵容分析
│   │   ├── game-analyzer.ts     # 实时局势分析
│   │   ├── player-analyzer.ts   # 玩家风格分析
│   │   └── stat-utils.ts        # 统计工具函数
│   │
│   ├── ai/                      # AI 推理层
│   │   ├── advisor.ts           # Claude API 调用 & 建议生成
│   │   ├── prompts.ts           # Prompt 模板管理
│   │   └── throttle.ts          # API 调用频率控制
│   │
│   ├── db/                      # 数据存储
│   │   ├── schema.sql           # 数据库建表
│   │   ├── database.ts          # SQLite 封装
│   │   └── migrations/          # 数据库迁移
│   │
│   └── ui/                      # 前端 (React)
│       ├── App.tsx
│       ├── views/
│       │   ├── DraftView.tsx
│       │   ├── GameView.tsx
│       │   ├── PostGameView.tsx
│       │   └── SettingsView.tsx
│       ├── components/
│       │   ├── HeroGrid.tsx
│       │   ├── AdvicePanel.tsx
│       │   ├── TimingAlert.tsx
│       │   └── StatusBar.tsx
│       ├── stores/
│       │   └── gameStore.ts     # Zustand 状态
│       └── styles/
│           └── globals.css
│
├── scripts/
│   ├── fetch-initial-data.ts    # 首次运行数据初始化
│   └── compute-stats.ts         # 手动触发统计计算
│
└── config/
    ├── default.json             # 默认配置
    └── gamestate_integration_coach.cfg  # GSI 配置文件模板
```

---

## 5. 开发路线图

### Phase 1 — MVP（2-3 周）

1. **数据层搭建**
   - [ ] GSI 服务器接收游戏数据
   - [ ] OpenDota API 对接，拉取英雄统计数据
   - [ ] SQLite 数据库初始化 & 基础表

2. **核心分析**
   - [ ] 英雄克制矩阵自动计算
   - [ ] 英雄胜率-时长曲线
   - [ ] 基础阵容评分

3. **AI 建议 V1**
   - [ ] Claude API 对接
   - [ ] 赛前英雄推荐
   - [ ] 对线阶段基础建议

4. **简易 UI**
   - [ ] Electron 基础窗口
   - [ ] 建议面板展示

### Phase 2 — 完善（3-4 周）

- [ ] 完整的中后期策略建议
- [ ] 玩家风格识别
- [ ] Overlay 悬浮窗
- [ ] 肉山/关键时间节点提醒
- [ ] 建议历史回顾

### Phase 3 — 优化（持续）

- [ ] 建议质量评估 & 调优
- [ ] 更多数据源整合 (Stratz GraphQL)
- [ ] 人工规则管理界面
- [ ] 多语言支持
- [ ] 赛后复盘分析

---

## 6. 环境与依赖

### 6.1 技术栈

| 组件 | 技术 |
|------|------|
| 运行时 | Node.js 20+ |
| 语言 | TypeScript 5.x |
| 桌面框架 | Electron 30+ |
| 前端 | React 18 + Tailwind CSS |
| 状态管理 | Zustand |
| 数据库 | better-sqlite3 |
| HTTP 服务 | Express (GSI) |
| AI | @anthropic-ai/sdk (Claude API) |
| HTTP 客户端 | axios |
| 构建 | electron-builder |

### 6.2 外部 API Key

```env
# .env 文件
ANTHROPIC_API_KEY=sk-ant-...        # Claude API (必须)
OPENDOTA_API_KEY=...                 # OpenDota (可选，无 key 有速率限制)
STRATZ_API_KEY=...                   # Stratz (可选，Phase 2)
STEAM_API_KEY=...                    # Steam Web API (玩家信息)
```

---

## 7. 关键设计决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| AI 模型 | Claude Sonnet 4.5 | 性价比最优，响应速度快，足够处理策略推理 |
| 数据库 | SQLite | 本地应用，无需网络数据库，部署简单 |
| 数据窗口 | 近 2-3 周 | 平衡数据量与版本时效性 |
| 建议频率 | 分钟级 | 策略层面不需要秒级，减少 API 成本 |
| 架构 | Electron 单体 | MVP 阶段简化部署，后续可拆分 |
| 策略来源 | 数据驱动 + LLM | 无需手写规则，自动适应版本更新 |

---

## 8. 注意事项

- **合规性**：仅使用 Valve 官方 GSI 和公开 API，不读取游戏内存，不注入游戏进程
- **API 成本**：Claude API 按 token 计费，注意 prompt 长度控制和调用频率
- **OpenDota 速率限制**：无 API Key 限制 60 次/分钟，有 Key 限制 1200 次/分钟
- **数据准确性**：低样本量的统计结果需标记置信度，避免误导
- **版本更新**：大版本更新后需等待 3-5 天积累足够新数据再更新统计

---

## 9. 游戏阶段状态机

### 9.1 设计背景

GSI 数据中的 `map.game_state` 字段仅区分三个宏观状态（选人 / 游戏中 / 赛后），无法直接对应产品所需的"对线期 / 中期 / 后期"阶段划分。本节定义一套内部状态机，基于 GSI 字段的组合判断来驱动阶段跳转。

### 9.2 阶段定义与触发条件

```typescript
// src/analysis/game-phase-machine.ts

type InternalPhase =
  | 'IDLE'           // 应用启动，未检测到游戏
  | 'DRAFT'          // Ban/Pick 阶段
  | 'PRE_GAME'       // 游戏加载，倒计时阶段（clock_time < 0）
  | 'LANING'         // 对线期：0 ~ 10 min
  | 'MID_GAME'       // 中期：10 ~ 25 min
  | 'LATE_GAME'      // 后期：25 min+
  | 'POST_GAME';     // 赛后

interface PhaseTransitionRule {
  from: InternalPhase | InternalPhase[];
  to: InternalPhase;
  condition: (payload: GSIPayload, prev: GSIPayload | null) => boolean;
  priority: number; // 数字越小优先级越高
}

const PHASE_TRANSITIONS: PhaseTransitionRule[] = [
  {
    from: 'IDLE', to: 'DRAFT', priority: 1,
    condition: (p) =>
      p.map?.game_state === 'DOTA_GAMERULES_STATE_HERO_SELECTION' ||
      p.map?.game_state === 'DOTA_GAMERULES_STATE_STRATEGY_TIME',
  },
  {
    from: 'DRAFT', to: 'PRE_GAME', priority: 1,
    condition: (p) =>
      p.map?.game_state === 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' &&
      (p.map?.clock_time ?? 0) < 0,
  },
  {
    from: 'PRE_GAME', to: 'LANING', priority: 1,
    condition: (p) =>
      p.map?.game_state === 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' &&
      (p.map?.clock_time ?? -1) >= 0,
  },
  {
    from: 'LANING', to: 'MID_GAME', priority: 2,
    condition: (p) => {
      const time = p.map?.clock_time ?? 0;
      if (time < 600) return false;
      const towersLost =
        (p.buildings?.dire?.top_melee?.health === 0) ||
        (p.buildings?.radiant?.bot_melee?.health === 0);
      return towersLost || time >= 720;
    },
  },
  {
    from: 'MID_GAME', to: 'LATE_GAME', priority: 2,
    condition: (p) => (p.map?.clock_time ?? 0) >= 1500,
  },
  {
    from: ['DRAFT', 'PRE_GAME', 'LANING', 'MID_GAME', 'LATE_GAME'],
    to: 'POST_GAME', priority: 0,
    condition: (p) =>
      p.map?.game_state === 'DOTA_GAMERULES_STATE_POST_GAME' ||
      p.map?.win_team === 'radiant' ||
      p.map?.win_team === 'dire',
  },
  // IDLE 回退由 90 秒超时计时器驱动（见 9.3）
];
```

### 9.3 状态机实现

```typescript
export class GamePhaseMachine extends EventEmitter {
  private current: InternalPhase = 'IDLE';
  private lastPayload: GSIPayload | null = null;
  private idleTimer: NodeJS.Timeout | null = null;
  private readonly IDLE_TIMEOUT_MS = 90_000; // 90 秒无推送 → IDLE

  process(payload: GSIPayload): void {
    this.resetIdleTimer();
    const sorted = [...PHASE_TRANSITIONS].sort((a, b) => a.priority - b.priority);
    for (const rule of sorted) {
      const fromMatch = Array.isArray(rule.from)
        ? rule.from.includes(this.current)
        : rule.from === this.current;
      if (!fromMatch) continue;
      if (rule.condition(payload, this.lastPayload)) {
        this.transition(rule.to, payload);
        break;
      }
    }
    this.lastPayload = payload;
  }

  private transition(next: InternalPhase, payload: GSIPayload): void {
    if (next === this.current) return;
    const prev = this.current;
    this.current = next;
    this.emit('phase_changed', { from: prev, to: next, payload, timestamp: Date.now() });
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      if (this.current !== 'IDLE' && this.current !== 'POST_GAME') {
        this.transition('IDLE', {} as GSIPayload);
      }
    }, this.IDLE_TIMEOUT_MS);
  }

  getPhase(): InternalPhase { return this.current; }
}
```

---

## 10. 模块间事件总线

### 10.1 设计原则

各模块通过单例 `EventBus` 解耦通信，不允许模块直接引用彼此实例。

### 10.2 事件总线接口

```typescript
// src/core/event-bus.ts

export type BusEventName =
  | 'gsi:connected' | 'gsi:disconnected' | 'gsi:payload'
  | 'gsi:draft_update' | 'gsi:game_state'
  | 'phase:changed'
  | 'analysis:draft_result' | 'analysis:game_snapshot' | 'analysis:critical_event'
  | 'advisor:advice_ready' | 'advisor:error' | 'advisor:throttled'
  | 'data:refresh_started' | 'data:refresh_done' | 'data:refresh_error';

export class EventBus extends EventEmitter {
  private static instance: EventBus;
  static getInstance(): EventBus {
    if (!EventBus.instance) EventBus.instance = new EventBus();
    return EventBus.instance;
  }
  publish<T>(event: BusEventName, data: T): void { this.emit(event, data); }
  subscribe<T>(event: BusEventName, handler: (data: T) => void): void { this.on(event, handler); }
  unsubscribe<T>(event: BusEventName, handler: (data: T) => void): void { this.off(event, handler); }
}

export const bus = EventBus.getInstance();
```

### 10.3 数据流向图

```
Dota 2 客户端
  │ HTTP POST /gsi
  ▼
gsi-server.ts
  │ bus.publish('gsi:payload')
  ▼
game-phase-machine.ts
  │ bus.publish('phase:changed')
  ▼
game-analyzer.ts / draft-analyzer.ts
  │ bus.publish('analysis:game_snapshot')
  │ bus.publish('analysis:critical_event')
  ▼
advisor.ts
  │ bus.publish('advisor:advice_ready')
  ▼
main/index.ts (Electron 主进程)
  │ ipcMain → renderer
  ▼
React UI
```

### 10.4 核心事件 Payload 类型

```typescript
// src/core/bus-types.ts

export interface PhaseChangedEvent {
  from: InternalPhase;
  to: InternalPhase;
  gameTime: number;
  timestamp: number;
}

export interface CriticalEvent {
  type: 'roshan_window' | 'teamwipe' | 'tower_fallen' | 'item_spike' | 'aegis_expire';
  message: string;
  priority: 'high' | 'medium';
  gameTime: number;
}

export interface AdvicePayload {
  phase: InternalPhase;
  content: string;
  triggeredBy: 'scheduled' | 'critical_event' | 'draft_change';
  gameTime: number;
  tokenUsage: { input: number; output: number };
}

export interface AdvisorError {
  code: 'api_error' | 'timeout' | 'rate_limit' | 'context_overflow';
  message: string;
  retryAfterMs?: number;
}
```

---

## 11. Electron IPC 协议

### 11.1 通道命名规范

```
push:*   主进程 → 渲染进程（主动推送）
req:*    渲染进程 → 主进程（发起请求）
res:*    主进程 → 渲染进程（响应请求）
```

### 11.2 完整通道表

| 通道名 | 方向 | 触发时机 | Payload 类型 |
|--------|------|----------|-------------|
| `push:phase_changed` | main → renderer | 游戏阶段变更 | `PhaseChangedEvent` |
| `push:advice_ready` | main → renderer | Claude 建议就绪 | `AdvicePayload` |
| `push:game_snapshot` | main → renderer | 每 5 秒一次 | `GameSnapshot` |
| `push:draft_result` | main → renderer | Draft 分析完成 | `DraftResult` |
| `push:critical_event` | main → renderer | 关键事件触发 | `CriticalEvent` |
| `push:data_status` | main → renderer | 数据刷新状态变化 | `DataStatus` |
| `push:error` | main → renderer | 后端错误 | `AppError` |
| `req:get_settings` | renderer → main | 进入 SettingsView | — |
| `res:get_settings` | main → renderer | 响应设置读取 | `AppSettings` |
| `req:save_settings` | renderer → main | 用户保存设置 | `Partial<AppSettings>` |
| `req:force_refresh` | renderer → main | 手动刷新数据 | `{ target: DataTarget }` |
| `req:toggle_overlay` | renderer → main | 切换 Overlay | `{ visible: boolean }` |

### 11.3 主进程 IPC 注册模板

```typescript
// src/main/ipc-handler.ts

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  // bus → renderer 推送
  bus.subscribe<AdvicePayload>('advisor:advice_ready', (data) => {
    mainWindow.webContents.send('push:advice_ready', data);
  });
  bus.subscribe<PhaseChangedEvent>('phase:changed', (data) => {
    mainWindow.webContents.send('push:phase_changed', data);
  });

  // renderer → main 请求
  ipcMain.handle('req:get_settings', async () => settingsStore.getAll());
  ipcMain.handle('req:save_settings', async (_e, partial) => {
    settingsStore.set(partial);
    return { ok: true };
  });
}
```

### 11.4 渲染进程 IPC Hook

```typescript
// src/ui/hooks/useIpc.ts

export function useIpcListeners(): void {
  const store = useGameStore();
  useEffect(() => {
    const handlers: Array<[string, (d: any) => void]> = [
      ['push:advice_ready',   (d) => store.setLatestAdvice(d)],
      ['push:phase_changed',  (d) => store.setPhase(d.to)],
      ['push:game_snapshot',  (d) => store.setSnapshot(d)],
      ['push:critical_event', (d) => store.addCriticalEvent(d)],
    ];
    handlers.forEach(([ch, fn]) => ipcRenderer.on(ch, (_e, data) => fn(data)));
    return () => { handlers.forEach(([ch, fn]) => ipcRenderer.removeListener(ch, fn)); };
  }, []);
}
```

---

## 12. Mock / 开发模式

### 12.1 启用方式

```bash
# 无需 Dota 2 运行即可开发
DOTA_MOCK=1 MOCK_SCENARIO=mid_game node src/gsi-server.js
```

| 环境变量 | 可选值 | 说明 |
|----------|--------|------|
| `DOTA_MOCK` | `1` | 启用 Mock 模式 |
| `MOCK_SCENARIO` | `draft` / `laning` / `mid_game` / `late_game` / `post_game` | 初始场景 |
| `MOCK_SPEED` | `1`~`60` | 时间流速倍率 |

### 12.2 Mock 数据文件结构

```
src/dev/mock-data/scenarios/
├── draft.json          # 选人阶段
├── laning-5min.json    # 对线 5 分钟
├── mid-game-15min.json # 中期 15 分钟，己方领先 3k 金
├── late-game-30min.json
└── post-game.json
```

每个文件与真实 GSI payload 同构，可直接通过 `POST /gsi` 发送进行测试。

### 12.3 Mock GSI 服务器

```typescript
// src/dev/mock-gsi.ts

export class MockGsiServer extends EventEmitter {
  start(speedMultiplier = 1): void {
    this.emit('payload', scenario);
    setInterval(() => {
      const ticked = { ...scenario, map: { ...scenario.map, clock_time: scenario.map.clock_time + speedMultiplier }};
      this.emit('payload', ticked);
    }, 1000 / speedMultiplier);
  }
}

// 注入点（src/data/gsi-server.ts）
export async function createGsiServer(): Promise<GsiServerLike> {
  if (process.env.DOTA_MOCK === '1') {
    const { MockGsiServer } = await import('../dev/mock-gsi');
    const mock = new MockGsiServer();
    mock.start(Number(process.env.MOCK_SPEED ?? 1));
    return mock;
  }
  return new RealGsiServer();
}
```

---

## 13. 错误处理与容错策略

### 13.1 错误分类

| 错误类型 | 来源 | 严重程度 | 处理方式 |
|----------|------|----------|----------|
| `gsi_disconnect` | GSI 超时 90s | 中 | 状态机回 IDLE，UI 显示等待层 |
| `api_claude_error` | Claude 5xx / 网络 | 中 | 指数退避 3 次后降级静态建议 |
| `api_claude_rate_limit` | 429 | 低 | 等待 Retry-After，静默重试 |
| `api_opendota_down` | OpenDota 不可用 | 低 | 使用过期缓存，不中断应用 |
| `db_error` | SQLite 读写失败 | 高 | 弹窗提示 + 记录日志 |
| `context_overflow` | Prompt 超 token 上限 | 低 | 自动裁剪（见第 14 节）|

### 13.2 Claude API 容错

```typescript
// src/ai/advisor.ts

private async callWithRetry(prompt: string): Promise<string> {
  try {
    const response = await this.client.messages.create({ /* ... */ });
    this.consecutiveFailures = 0;
    return response.content[0].text;
  } catch (err: any) {
    this.consecutiveFailures++;
    if (err.status === 429) {
      const retryAfter = Number(err.headers?.['retry-after'] ?? 60) * 1000;
      await sleep(retryAfter);
      return this.callWithRetry(prompt);
    }
    if (this.consecutiveFailures >= 3) return this.getFallbackAdvice();
    await sleep(Math.min(30_000 * 2 ** this.consecutiveFailures, 300_000));
    return this.callWithRetry(prompt);
  }
}

// 降级：从静态文本返回基础建议
private getFallbackAdvice(): string {
  const fallbacks: Record<string, string> = {
    LANING:   '[离线模式] 专注补刀，保持安全位置，等待 API 恢复。',
    MID_GAME: '[离线模式] 关注肉山计时，与队友保持视野。',
    LATE_GAME:'[离线模式] 集中行动，避免单独被杀。',
  };
  return fallbacks[phaseMachine.getPhase()] ?? '[离线模式] AI 建议暂时不可用。';
}
```

### 13.3 OpenDota 缓存回退

```typescript
async function fetchWithCache<T>(url: string, cacheKey: string, ttlMs: number): Promise<T> {
  const cached = db.get<T>(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < ttlMs) return cached.data;
  try {
    const data = await axios.get<T>(url, { timeout: 10_000 });
    db.set(cacheKey, { data: data.data, fetchedAt: Date.now() });
    return data.data;
  } catch {
    if (cached) return cached.data; // 使用过期缓存
    throw new Error('DATA_UNAVAILABLE');
  }
}
```

---

## 14. Claude 上下文管理策略

### 14.1 Token 预算分配

| 部分 | Token 上限 | 说明 |
|------|-----------|------|
| System Prompt | 500 | 固定 |
| 双方阵容 + 玩家信息 | 300 | 固定 |
| 当前 GameSnapshot | 400 | 每次更新 |
| 最近 5 条关键事件 | 200 | 去重后 |
| 最近 2 条建议摘要 | 300 | 压缩到 100 字/条 |
| 相关英雄统计 | 250 | 按对阵英雄筛选 |
| **合计 Input** | **~1950** | 留出 1024 output |

### 14.2 ContextManager 实现

```typescript
// src/ai/context-manager.ts

export class ContextManager {
  private adviceHistory: Array<{ gameTime: number; summary: string }> = [];

  buildPrompt(snapshot: GameSnapshot, draft: DraftResult, player: PlayerProfile, events: CriticalEvent[]): { system: string; user: string } {
    const recentAdvice = this.adviceHistory.slice(-2)
      .map((a) => `[${formatTime(a.gameTime)}] ${a.summary.slice(0, 100)}`).join('\n');
    const deduped = this.deduplicateEvents(events.slice(-10));
    // 填充 GAME_PROMPT_TEMPLATE...
    return { system: SYSTEM_PROMPT, user: filledTemplate };
  }

  recordAdvice(gameTime: number, content: string): void {
    this.adviceHistory.push({ gameTime, summary: content.split('\n')[0].slice(0, 120) });
    if (this.adviceHistory.length > 10) this.adviceHistory.shift();
  }

  clearHistory(): void { this.adviceHistory = []; }

  private deduplicateEvents(events: CriticalEvent[]): CriticalEvent[] {
    const seen = new Map<string, CriticalEvent>();
    for (const e of events) seen.set(e.type, e);
    return [...seen.values()];
  }
}
```

### 14.3 阶段切换时重置上下文

```typescript
bus.subscribe<PhaseChangedEvent>('phase:changed', ({ to }) => {
  if (to === 'MID_GAME' || to === 'LATE_GAME') contextManager.clearHistory();
  if (to === 'IDLE' || to === 'POST_GAME') contextManager.clearHistory();
});
```

---

## 15. 首次启动初始化流程

### 15.1 启动检查逻辑

```typescript
// src/main/index.ts

type OnboardingStep = 'api_key' | 'player_link' | 'db_init' | 'data_fetch' | 'done';

async function checkOnboardingStatus(): Promise<OnboardingStep> {
  const settings = settingsStore.getAll();
  if (!settings.anthropicApiKey) return 'api_key';
  if (!settings.steamId)         return 'player_link';
  if (!db.isInitialized())       return 'db_init';
  if (db.isEmpty('heroes'))      return 'data_fetch';
  return 'done';
}
```

### 15.2 Onboarding 流程

```
应用启动
  ├─ [无 API Key]      → OnboardingView 步骤 1：输入 Claude API Key（发送测试消息验证）
  ├─ [无 Steam ID]     → OnboardingView 步骤 2：输入 Steam ID（OpenDota 验证存在）
  ├─ [DB 未初始化]     → 执行 schema.sql
  ├─ [heroes 表为空]   → OnboardingView 步骤 3：首次数据拉取（进度条）
  └─ [全部就绪]        → OnboardingView 步骤 4：引导完成 → 进入主界面
```

### 15.3 首次数据拉取顺序

1. 拉取英雄列表（`/heroStats`）
2. 拉取英雄克制数据（按批次，每批 10 个英雄，间隔 1s）
3. 拉取胜率-时长曲线
4. 拉取当前版本 Meta 统计

预计总耗时：2-5 分钟（受 OpenDota 速率限制）

---

## 16. API Key 安全存储

### 16.1 方案选择

| 场景 | 方案 |
|------|------|
| 生产（跨平台）| `electron-store` + `safeStorage`（OS 级加密） |
| 开发环境 | `.env`（仅本地，不打包进应用） |

### 16.2 SettingsStore 实现

```typescript
// src/main/settings-store.ts

import Store from 'electron-store';
import { safeStorage } from 'electron';

const ENCRYPTED_KEYS = ['anthropicApiKey', 'openDotaApiKey', 'stratzApiKey', 'steamApiKey'];

class SettingsStore {
  private store = new Store({ name: 'dota-coach-settings' });

  get(key: string): string {
    const raw = this.store.get(key, '') as string;
    if (ENCRYPTED_KEYS.includes(key) && raw && safeStorage.isEncryptionAvailable()) {
      try { return safeStorage.decryptString(Buffer.from(raw, 'base64')); }
      catch { return ''; }
    }
    return raw;
  }

  set(key: string, value: string): void {
    if (ENCRYPTED_KEYS.includes(key) && safeStorage.isEncryptionAvailable()) {
      this.store.set(key, safeStorage.encryptString(value).toString('base64'));
    } else {
      this.store.set(key, value);
    }
  }
}

export const settingsStore = new SettingsStore();
```

**重要：** 渲染进程不直接访问 `electron-store`，所有读写必须经由 IPC（`req:get_settings` / `req:save_settings`）。

---

## 17. 英雄资产管线

### 17.1 来源优先级

1. **本地缓存**（`userData/hero-assets/`）：首选，零网络延迟
2. **Dota 2 官方 CDN**：`https://cdn.dota2.com/apps/dota2/images/heroes/{name}_icon.png`
3. **SteamDB CDN（备用）**：`https://steamcdn-a.akamaihd.net/apps/dota2/images/heroes/{name}_full.png`

### 17.2 本地缓存目录

```
userData/hero-assets/
├── heroes/
│   ├── npc_dota_hero_antimage_icon.png     # 60×35 列表用
│   └── npc_dota_hero_antimage_portrait.png  # 100×100 Draft 用
├── items/
└── manifest.json   # { "version": "7.38", "fetchedAt": 1700000000 }
```

### 17.3 资产下载器

```typescript
// src/data/asset-downloader.ts

export async function ensureHeroIcons(heroes: Hero[]): Promise<void> {
  const manifest = await loadManifest();
  for (const hero of heroes.filter((h) => !manifest.heroes[h.name])) {
    const url = `https://cdn.dota2.com/apps/dota2/images/heroes/${hero.name.replace('npc_dota_hero_', '')}_icon.png`;
    try {
      const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 5000 });
      await fs.writeFile(path.join(CACHE_DIR, `${hero.name}_icon.png`), Buffer.from(res.data));
      manifest.heroes[hero.name] = { cachedAt: Date.now() };
    } catch { logger.warn(`英雄图标下载失败: ${hero.name}`); }
  }
  await saveManifest(manifest);
}
```

### 17.4 React HeroIcon 组件（含 CDN 降级）

```typescript
// src/ui/components/HeroIcon.tsx

export function HeroIcon({ heroName, size = 'md' }: { heroName: string; size?: 'sm'|'md'|'lg' }) {
  const local = `file://${path.join(CACHE_DIR, `${heroName}_icon.png`)}`;
  const fallback = `https://cdn.dota2.com/apps/dota2/images/heroes/${heroName.replace('npc_dota_hero_', '')}_icon.png`;
  return (
    <img src={local} onError={(e) => { (e.target as HTMLImageElement).src = fallback; }} alt={heroName} />
  );
}
```

### 17.5 版本更新策略

每次检测到 OpenDota 返回的版本号（`/constants/patch`）变化时，清空 `hero-assets/` 目录并重新下载。

---

## 18. 日志与诊断

### 18.1 日志等级

| 等级 | 使用场景 |
|------|----------|
| `ERROR` | 影响功能的错误（API 失败、DB 写入错误）|
| `WARN` | 非致命异常（缓存过期、下载重试）|
| `INFO` | 关键业务事件（阶段变更、建议生成、数据刷新）|
| `DEBUG` | 详细调试（每次 GSI payload、prompt 内容）|

生产构建默认：`INFO`；开发模式默认：`DEBUG`。

### 18.2 日志文件位置

```
userData/logs/
├── main.log      # 主进程（滚动，最大 10MB × 5 文件）
├── gsi.log       # GSI 原始数据（仅 DEBUG 模式）
└── advisor.log   # Claude 输入/输出（用于 prompt 调优）
```

Windows 路径：`%APPDATA%\dota2-coach\logs\`

### 18.3 Logger 实现

```typescript
// src/core/logger.ts

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

class Logger {
  private minLevel: LogLevel = process.env.NODE_ENV === 'development' ? 'DEBUG' : 'INFO';

  private write(level: LogLevel, channel: string, message: string, meta?: object): void {
    if (['DEBUG','INFO','WARN','ERROR'].indexOf(level) < ['DEBUG','INFO','WARN','ERROR'].indexOf(this.minLevel)) return;
    const line = JSON.stringify({ ts: new Date().toISOString(), level, msg: message, ...meta }) + '\n';
    this.getStream(channel).write(line);
  }

  debug(msg: string, meta?: object) { this.write('DEBUG', 'main', msg, meta); }
  info(msg: string, meta?: object)  { this.write('INFO',  'main', msg, meta); }
  warn(msg: string, meta?: object)  { this.write('WARN',  'main', msg, meta); }
  error(msg: string, meta?: object) { this.write('ERROR', 'main', msg, meta); }
  gsi(payload: object)              { this.write('DEBUG', 'gsi', 'GSI payload', payload); }
  advisor(prompt: string, output: string, tokens: object) {
    this.write('INFO', 'advisor', 'Claude call', { promptLen: prompt.length, output, tokens });
  }
}

export const logger = new Logger();
```

### 18.4 必须记录的关键事件

| 事件 | 等级 |
|------|------|
| GSI 服务器启动 | INFO |
| GSI 首次收到 payload | INFO |
| 游戏阶段变更 | INFO |
| Claude API 调用（含 token 用量）| INFO |
| Claude API 失败 / 降级 | ERROR |
| OpenDota 请求失败（使用缓存）| WARN |
| 数据刷新完成 | INFO |
| 首次 Onboarding 完成 | INFO |
| 资产下载失败（单个英雄）| WARN |

### 18.5 SettingsView 诊断面板

```typescript
interface DiagnosticsInfo {
  gsiStatus: 'connected' | 'waiting' | 'idle';
  lastGsiAt: number | null;
  claudeStatus: 'ok' | 'error' | 'rate_limited';
  claudeCallsToday: number;
  tokenUsedToday: number;
  dbSizeBytes: number;
  heroCacheCount: number;
  logPath: string;      // 可点击在文件管理器中打开
  appVersion: string;
}
```

