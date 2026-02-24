# DotaWatchdog

一个 Windows 桌面自律工具。想打 Dota 2？先过三关。

---

## 这是什么

太容易冲动开局了。这个工具在 Dota 2 启动前设置三道强制关卡，用工程师思维解决意志力问题。

**三道解锁条件，全部满足才能开游戏：**

1. **冷却计时**：启动 app 后强制等待 20 分钟（可配置）
2. **算法题**：随机抽一道算法题，需提交代码 + 解释思路
3. **Follow-up**：若题目为 Easy，GPT-4o-mini 会追加一道深化问题

关没过？打开 Dota → 直接被杀死进程，弹出通知告诉你差什么。

---

## 工作原理

- **进程拦截**：每 2 秒检查 `dota2.exe` 是否在运行，条件未满足时强制终止。Steam 启动和独立 exe 启动均被拦截
- **AI 验证**：不依赖 LeetCode API（无官方 SDK，非官方接口需要维护 session cookie）。用户在 app 内提交代码和解释，GPT-4o-mini 直接判定正确性和理解深度
- **防绕过**：冷却开始时间戳写入磁盘，重启 app 不会重置计时

---

## 安装与启动

### 第一步：环境准备

确认已安装以下工具（在终端运行版本命令验证）：

```bash
node -v   # 需要 18.0 以上
npm -v    # 通常随 Node.js 一起安装
```

如未安装，前往 [nodejs.org](https://nodejs.org/) 下载 LTS 版本。

---

### 第二步：安装依赖

在项目根目录的 `DotaWatchdog` 文件夹下打开终端（管理员权限）：

```bash
cd DotaWatchdog
npm install
```

> 首次安装约需 1-2 分钟，会下载 Electron、React、OpenAI SDK 等依赖。

---

### 第三步：获取 OpenAI API Key

1. 前往 [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. 登录后点击 **Create new secret key**
3. 复制生成的 Key（格式为 `sk-proj-...`），**只显示一次，请立即保存**

> 使用 `gpt-4o-mini` 模型，每次算法题验证约消耗 $0.001，极低成本。

---

### 第四步：启动开发模式

```bash
# 必须以管理员身份运行终端（taskkill 需要权限）
npm run dev
```

启动后会依次：
1. 编译 TypeScript 主进程代码
2. 启动 Vite 开发服务器（Renderer）
3. 打开 Electron 窗口

> 第一次启动会有 10-15 秒等待，等 `dist/main/index.js` 编译完成后 Electron 才会打开。

---

### 第五步：配置 API Key

1. 应用启动后右键系统托盘图标 → **设置**，或直接在主窗口点击右上角 ⚙
2. 在 **OpenAI API Key** 输入框粘贴刚才复制的 Key
3. 点击 **测试** 验证连接成功
4. 点击 **保存设置**

Key 会用 Windows 系统级加密（safeStorage）存储，不会明文保存到磁盘。

---

### 第六步：正式使用

```
启动 DotaWatchdog
    ↓ 自动开始 20 分钟冷却
    ↓ 期间尝试开 Dota → 被秒杀 + 通知
    ↓ 冷却结束 → 随机抽一道算法题
    ↓ 在编辑器内写代码 + 文字解释思路
    ↓ 点击「提交解答」→ GPT-4o-mini 验证
    ↓ Easy 题：追加一道深化问题
    ↓ 全部通过 → 图标变绿 → Dota 2 解锁
```

---

### 可选：打包为可执行文件

如果希望分发或不依赖开发环境运行：

```bash
npm run dist
```

生成的安装包在 `release/` 目录下，双击 `.exe` 安装即可。安装版会自动请求管理员权限。

---

## 使用方式（日常）

每天启动 DotaWatchdog 后流程相同，当日解锁后不需要重复验证（到次日 0 点重置）。

- **右键托盘图标** → 可查看当前状态、手动重新锁定、退出
- **重新锁定**：点击后清除今日解锁记录，需重新完成冷却 + 算法题（自律加码）
- **修改冷却时长**：进设置调整，下次启动生效

---

## 配置说明

首次运行需在设置界面填入：

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| OpenAI API Key | GPT-4o-mini 验证算法题用，本地加密存储，格式：sk-proj-... | 必填 |
| 冷却时长 | 启动后等待时间（分钟） | 20 |
| 开机自启 | 登录 Windows 时自动启动 | 开启 |

---

## 算法题库

本地预置 50 道题，全部来自用户 LeetCode 实际练习记录，无需网络即可抽题：

| 分类 | 题目 | 难度 | 预设追加问题 |
|------|------|------|------------|
| 树遍历 | 94, 144, 145, 102, 429, 589, 590, 111 | Easy/Medium | 145, 590 有迭代追加 |
| 图 | 797 | Medium | BFS 实现追加 |
| 链表 | 21, 86, 23, 19, 876, 141, 142, 160, 82, 83, 2, 445, 234, 206 | Easy~Hard | 23, 876, 234 有追加 |
| 堆 | 378, 373 | Medium | — |
| 数组/数学 | 9, 13, 66, 766, 1295, 1394, 1450, 1470, 1480, 1952, 3024, 3028, 3099 | Easy | — |
| 滑动窗口/二分 | 424, 1004, 1482 | Medium | — |
| 贪心/哈希 | 954, 1390 | Medium | — |
| 周赛 | 2553, 2554, 2555, 2556, 2869, 2870, 2871 | Easy~Hard | — |

**预设追加问题**（5 道 Easy 题有预定义 follow-up，优先于 AI 生成）：
- **145** 后序遍历：迭代（栈）实现思路
- **590** N-ary 后序：iterative approach
- **797** 路径搜索：BFS 实现，如何追踪路径
- **876** 链表中点：返回第一个中间节点的快慢指针修改
- **234** 回文链表：O(n) 时间 O(1) 空间原地实现

---

## 常见问题

**Dota 2 启动了但没被拦截？**

确认 DotaWatchdog 以管理员权限运行。安装包会自动请求管理员权限；开发模式需手动以管理员身份运行终端。

**OpenAI API Key 在哪里获取？**

前往 [platform.openai.com/api-keys](https://platform.openai.com/api-keys) 创建 Key。每次算法题验证使用 gpt-4o-mini，费用极低（约 $0.001/次）。

**可以直接跳过冷却吗？**

不行。冷却时间戳在启动时写入磁盘，重启 app 会读取文件并恢复剩余时间。

---

## 技术栈

- **Electron** — 桌面应用框架
- **React + TypeScript** — UI
- **Vite** — 构建工具
- **Tailwind CSS** — 样式
- **OpenAI API（openai）** — GPT-4o-mini 算法题验证，使用 `response_format: json_object` 保证 JSON 输出
- **electron-store** — 设置持久化（API Key 用 safeStorage 加密）
- **Monaco Editor** — 代码输入框
- **Zustand** — 前端状态管理

---

## 项目结构

```
DotaWatchdog/
├── src/
│   ├── main/          # Electron 主进程
│   ├── core/          # 状态机 + 事件总线
│   ├── blocker/       # 进程监控 + taskkill
│   ├── cooldown/      # 冷却计时器
│   ├── challenge/     # 算法题库（problems.json）
│   ├── ai/            # OpenAI GPT-4o-mini 验证
│   └── ui/            # React 前端
├── assets/            # 图标资源
├── AGENTS.md          # 开发规范文档
└── README.md
```

详细架构和接口定义见 [AGENTS.md](./AGENTS.md)。
