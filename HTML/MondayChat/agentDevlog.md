# agentDevlog

This file tracks key dev decisions, controls, and known issues for MondayChat.

## Controls (VRM)
- OrbitControls: drag to rotate, wheel to zoom (both index + fittingroom).
- WASD moves avatar offset when move mode is enabled; Shift accelerates.
- Arm adjust pads: left/right zones; drag to change arm angle on chosen axis (switched to rotation.z for natural drop).
- **Default Pose**: Arms initialized to relaxed "down" state (approx 75°).

## Persistent State
- `monday_vrm_offset`: current live offset.
- `monday_vrm_offset_locked`: saved constant offset.
- `monday_vrm_move_enabled`: move toggle state.

## Debug Panel
- Fitting Room button.
- Move toggle + Save current offset.
- Offset readout shown as `(x, y, z)`.

## AI 对话系统（当前实现）

### PAD 情绪模型
- 三维情绪状态（Pleasure / Arousal / Dominance），每轮对话根据输入类型更新。
- `build_mood_context(pad, mood)` 将 PAD 数值翻译为中文风格指令，追加到 system prompt 尾部。
- 阈值：P ±0.35，A +0.40/-0.25，D ±0.30，MOOD ≤ -1.0 时触发极端覆盖。
- 前端 PAD 调试滑块（`/api/pad` 端点）支持直接注入状态，用于测试。

### 对话风格随机化
- `pick_response_mode(pad, clear_req, mood)` 每轮随机抽取风格提示注入 user_prompt：
  - direct（约 50%）：直接回应，无额外提示
  - question（约 20%）：以 Monday 自己的问题收尾
  - observe（约 15%）：发表侧面观察，不直接回应
  - redirect（约 15%）：接话后带去更值得谈的方向
- 权重随 PAD 状态动态调整（P 低时更多 redirect，A 高时更多 question）。

### 开场词
- 当前：`BOOT_LINES` 数组 + `Math.random()` 伪随机选取，每次页面刷新随机一条。
- **待完善（TODO）**：
  1. **真随机**：`Math.random()` 受同一毫秒内种子影响，快速连续刷新可能出现同一条。
     改进方案：使用 `crypto.getRandomValues()` 替代，保证均匀分布。
  2. **基于历史会话的开场**：将上次会话的最后状态（PAD 值、最后几轮对话摘要）持久化到 `localStorage`，
     下次启动时读取，走 `/api/chat` 接口生成一条上下文感知的开场白（如"上次你说的那件事，结果怎么样了？"），
     而不是从固定词库里随机抽。需要在 server 端增加 `session_resume` 的 action 类型处理。

## Notes / Known Issues
- Browser cache: HTML/JS/CSS should be no-store; use hard refresh if changes don’t show.
- Some VRM rigs differ; arm axis (x/y/z) may need per-model tuning.
- Model version: VRM 1.0 (user confirmed).
- Animation retargeting: FBX (Mixamo) now plays via runtime retargeting using source rest pose correction (parent world rotation * track rotation * rest inverse). VRMA conversion failed due to non‑compliant tracks; FBX retargeting is the current working path.
- **Fix**: Switched arm control axis from Y to Z to allow lowering arms from T-pose.
- **Known Issue**: T-pose may persist if initial rotation values are not applied after VRM load or are overwritten by default 0 values in the update loop.
