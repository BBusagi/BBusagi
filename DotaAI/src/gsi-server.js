'use strict';

const express = require('express');

const PORT = 3001;
const VERBOSE = process.argv.includes('--verbose');

const app = express();
app.use(express.json());

// ── 统计 ─────────────────────────────────────────────────────────
let totalReceived = 0;
let lastReceivedAt = null;

// ── 等待提示定时器（30 秒无数据时打印一次）────────────────────────
let waitTimer = setInterval(() => {
  if (!lastReceivedAt) {
    console.log('[等待] 尚未收到 Dota 2 数据，请确认：');
    console.log('       1. Dota 2 正在运行（进入游戏或选人界面）');
    console.log('       2. cfg 文件已放置到正确路径（见 README.md）');
  }
}, 30_000);

// ── GSI 接收端点 ─────────────────────────────────────────────────
app.post('/gsi', (req, res) => {
  res.sendStatus(200);

  const payload = req.body;
  totalReceived++;
  lastReceivedAt = new Date();

  // 停止等待提示
  if (waitTimer) {
    clearInterval(waitTimer);
    waitTimer = null;
  }

  // ── 格式化摘要输出 ────────────────────────────────────────────
  printSummary(payload);

  // ── Verbose 模式：打印完整 JSON ───────────────────────────────
  if (VERBOSE) {
    console.log('\n── 完整 payload ─────────────────────────────');
    console.log(JSON.stringify(payload, null, 2));
    console.log('─────────────────────────────────────────────\n');
  }
});

function printSummary(p) {
  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  const divider = '─'.repeat(50);

  console.log(`\n${divider}`);
  console.log(`[${time}]  第 ${totalReceived} 条数据`);

  // 游戏阶段
  const gameState = p.map?.game_state ?? '未知';
  const clockRaw  = p.map?.clock_time;
  const clockStr  = clockRaw != null ? formatClock(clockRaw) : '–';
  console.log(`  阶段：${translateState(gameState)}  |  游戏时间：${clockStr}`);

  // 玩家信息
  if (p.player) {
    const { gold = 0, gpm = 0, kills = 0, deaths = 0, assists = 0, last_hits = 0 } = p.player;
    console.log(`  经济：金钱 ${gold}  GPM ${gpm}`);
    console.log(`  战绩：${kills}/${deaths}/${assists}  补刀 ${last_hits}`);
  }

  // 英雄信息
  if (p.hero) {
    const { name = '', level = 0, health_percent = 0, mana_percent = 0, alive = true } = p.hero;
    const heroName = name.replace('npc_dota_hero_', '');
    const status   = alive ? `HP ${Math.round(health_percent)}%  MP ${Math.round(mana_percent)}%` : '死亡中';
    console.log(`  英雄：${heroName || '未选择'}  等级 ${level}  ${status}`);
  }

  // 选人阶段：显示 Ban/Pick 信息
  if (p.draft) {
    const activeTeam = p.draft.activeteam === 2 ? '天辉' : '夜魇';
    const action     = p.draft.pick ? 'Pick' : 'Ban';
    const remaining  = p.draft.activeteam_time_remaining?.toFixed(1) ?? '–';
    console.log(`  选人：${activeTeam} 正在 ${action}  剩余 ${remaining}s`);
  }

  // 肉山状态
  if (p.map?.roshan_state) {
    const rsMap = { alive: '存活', dead: '已死', unknown: '未知' };
    let rsStr = rsMap[p.map.roshan_state] ?? p.map.roshan_state;
    if (p.map.roshan_state_end_seconds) {
      rsStr += `（${formatClock(p.map.roshan_state_end_seconds)} 刷新）`;
    }
    console.log(`  肉山：${rsStr}`);
  }
}

// ── 工具函数 ─────────────────────────────────────────────────────

function formatClock(seconds) {
  const sign = seconds < 0 ? '-' : '';
  const abs  = Math.abs(Math.floor(seconds));
  const m    = Math.floor(abs / 60);
  const s    = abs % 60;
  return `${sign}${m}:${s.toString().padStart(2, '0')}`;
}

function translateState(state) {
  const map = {
    'DOTA_GAMERULES_STATE_DISCONNECTED':     '未连接',
    'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS': '游戏中',
    'DOTA_GAMERULES_STATE_HERO_SELECTION':   '选人阶段',
    'DOTA_GAMERULES_STATE_STRATEGY_TIME':    '策略时间',
    'DOTA_GAMERULES_STATE_PRE_GAME':         '准备阶段',
    'DOTA_GAMERULES_STATE_POST_GAME':        '赛后',
    'DOTA_GAMERULES_STATE_WAIT_FOR_PLAYERS_TO_LOAD': '等待加载',
  };
  return map[state] ?? state;
}

// ── 启动 ─────────────────────────────────────────────────────────
app.listen(PORT, '127.0.0.1', () => {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║        Dota 2 AI Coach — GSI 接收器 V1          ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`\n✓ 服务器已启动，监听 http://127.0.0.1:${PORT}/gsi`);
  console.log(`  模式：${VERBOSE ? 'Verbose（完整 JSON）' : '摘要（--verbose 开启完整输出）'}`);
  console.log('\n── 使用说明 ─────────────────────────────────────────');
  console.log('  将以下文件复制到 Dota 2 配置目录：');
  console.log('  config/gamestate_integration_coach.cfg');
  console.log('\n  Windows 路径：');
  console.log('  C:\\Program Files (x86)\\Steam\\steamapps\\common\\dota 2 beta\\game\\dota\\cfg\\');
  console.log('\n  测试（不需要 Dota 2，curl 模拟推送）：');
  console.log('  curl -X POST http://127.0.0.1:3001/gsi -H "Content-Type: application/json" -d @src/mock/laning.json');
  console.log('\n── 等待 Dota 2 数据 ─────────────────────────────────\n');
});
