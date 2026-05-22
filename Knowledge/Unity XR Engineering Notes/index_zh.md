# Unity XR 工程体系研究笔记
1. [Unity XR 技术栈全景图](./Note01_zh.md)
   + 入口文章，其他所有篇都从这里出发
   + 建立层级认知，解释为什么会混乱
   + 这是整个系列的地图，先读这篇

# 候选主题
+  OpenXR 为什么这么重要

+  OpenXR VS Oculus Integration到底解决了什么

+ Meta SDK 的包到底怎么选
    → All-in-One / Core / Interaction SDK 的依赖关系
    → 新项目怎么选，老项目怎么迁移

+ MRTK2 / MRTK3 / XRI 的关系
    → 为什么 MRTK3 不是 MRTK2 的升级
    → 微软为什么选择回归 Unity 官方生态
  + 后续素材：MRTK2 更像微软早期完整 MR 框架，不只是交互层，还包含 Input、UI、Solver、Spatial Awareness、Hand Menu、Diagnostics 等系统。
  + 后续素材：MRTK3 的重点不是 API 改名，而是底层回到 Input System + XRI + OpenXR，迁移时容易遇到 Input Action、Pointer / Ray、Hand Interaction、XR Rig、Playspace 和 OpenXR Feature 配置差异。

+ AR/MR 的几条路线
  + 工程经验较少

+ XR Rig 与 Playspace 的本质
  + 工程经验较少
  + 用户坐标系是怎么工作的
  + 移动、身高、原点错乱的根源

+ XR Runtime 与 Unity Application 的关系
  + 后续素材：Unity 并不是直接和 Quest 设备通信，而是通过 XR Plugin 接入 Meta Runtime，再由 Runtime 处理 Tracking、Rendering、Device System。
  + 后续素材：有些问题并不是 Unity 应用层错误，而是 Runtime、Tracking、Rendering 与空间系统共同组成的实时系统问题。

+ Unity 为什么不像原生 XR 引擎
  + 后续素材：Unity 本质上仍是传统游戏引擎，XR Rig、OpenXR Plugin、Input System、Passthrough、Hand Tracking、MR、Spatial Anchor 等能力都是随着 XR 行业发展逐渐叠加进来的。
  + 后续素材：传统 PC 图形和游戏开发的很多复杂度已经被行业标准和引擎封装稳定，但 XR 的 Runtime、Engine、Interaction Layer、Platform SDK 边界还在快速变化。

+ Unity XR 输入系统演进
  + OVRInput → Legacy Input → Input System → XRI Action
  + 为什么一个按钮没反应可以追到四个系统
  + 后续素材：Quest 项目里“手柄按钮没反应”可能同时涉及 Unity Input System、XRI Action、OpenXR Feature、Controller Profile、Meta SDK 版本冲突。

+ XR 中的 Render Pipeline
  + 双眼渲染、Single Pass、URP的取舍
  + 为什么普通 Unity 渲染经验在 XR 里经常失效

+ Passthrough 与 Camera API 实战
  + Passthrough 显示现实 vs Camera API 理解现实
  + 权限、Runtime 限制、你踩过的具体坑
  + 后续素材：为了使用 Meta 新开放的 Camera API，需要从旧版定制 SDK 逐步升级，同时处理 Unity 2021、Quest OS、Android Manifest、Oculus / OpenXR Plugin、Gradle、Meta Core SDK 的兼容关系。
  + 后续素材：Camera 权限曾因 Quest OS / Meta Core SDK 版本变化失效，最终需要继续升级 Meta Core SDK 才恢复。

+ MR Capture 原理
  + 为什么不是简单录屏
  + 空间对齐、渲染合成、左右眼问题
  + 后续素材：MR Capture 不只是读取 XR Camera，现实相机画面、Passthrough Layer、虚拟物体渲染、RenderTexture、左右眼视差、相机比例和 Android 权限都会参与。
  + 后续素材：把现实画面和 VR 画面合成为“头显中看到的一致画面”时，问题会从普通截图变成空间对齐与渲染合成问题。

+ Android 权限与 XR
  + Quest 本质是 Android 设备
  + Manifest 冲突、权限失效的排查逻辑
  + 后续素材：Camera API、MR 截图、QR Code 扫描、MR Streaming 都会碰到 Android 权限、Manifest、Runtime 限制和 SDK 版本之间的耦合。

+ Quest 工程性能优化
  + 移动 VR 的性能模型
  + Draw Call、Foveated Rendering、Profiler

+ VR 多人同步与 Photon

+ Unity XR 多平台兼容策略
  + Quest / PCVR / iOS 能共用一套工程吗
  + 哪些可以共用，哪些必须分开

+ SDK 地狱：为什么升级一次会牵一发动全身
  + 依赖关系为什么这么脆
  + 升级前应该检查什么
  + 这篇放最后，因为读者要先理解前面所有层才能真正理解这篇
  + 后续素材：SDK 从来不只是“功能包”，大型 XR 项目里的 SDK 升级经常接近系统级迁移，需要同时确认 Unity、Quest OS、OpenXR / Oculus Plugin、Gradle、Android Manifest、Meta Core SDK 和 Runtime 行为。
  + 后续素材：很多兼容性问题不会明确写在文档里，需要通过 Release Note、实机测试、社区 Issue、Runtime Debug 和多版本对比确认。
