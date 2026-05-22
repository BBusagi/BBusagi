# Unity XR 工程体系拆解
## 第零章：你在进入一个什么样的生态
0.  Unity XR 技术栈全景图
    → 建立层级认知，解释为什么会混乱
    → 这是整个系列的地图，先读这篇

    定位：入口文章，其他所有篇都从这里出发

## 第一阶段：搞清楚这些名字到底是什么
（回答：进项目第一天看到的那些SDK名字）

1.  OpenXR 到底解决了什么
    → 它不是插件，是标准
    → Extension 机制、边界在哪里

2.  Oculus Integration 为什么被淘汰
    → VrApi / LibOVR 的历史
    → 私有接口 → OpenXR 的演进过程

3.  Meta SDK 的包到底怎么选
    → All-in-One / Core / Interaction SDK 的依赖关系
    → 新项目怎么选，老项目怎么迁移

4.  MRTK2 / MRTK3 / XRI 的关系
    → 为什么 MRTK3 不是 MRTK2 的升级
    → 微软为什么选择回归 Unity 官方生态

5. AR/MR 的几条路线

## 第二阶段：搞清楚项目运行的底层逻辑
（回答：为什么XR项目的问题总是追到系统底层）

6.  XR Rig 与 Playspace 的本质
    → 用户坐标系是怎么工作的
    → 移动、身高、原点错乱的根源

7.  Unity XR 输入系统演进
    → OVRInput → Legacy Input → Input System → XRI Action
    → 为什么一个按钮没反应可以追到四个系统

8.  XR 中的 Render Pipeline
    → 双眼渲染、Single Pass、URP的取舍
    → 为什么普通Unity渲染经验在XR里经常失效

## 第三阶段：真正开始做功能时会踩什么坑
（回答：为什么XR功能总比想象中复杂）

9.  Passthrough 与 Camera API 实战
    → Passthrough 显示现实 vs Camera API 理解现实
    → 权限、Runtime限制、你踩过的具体坑

10.  MR Capture 原理
    → 为什么不是简单录屏
    → 空间对齐、渲染合成、左右眼问题

11.  Android 权限与 XR
    → Quest 本质是 Android 设备
    → Manifest 冲突、权限失效的排查逻辑

## 第四阶段：项目跑起来之后的长期问题
（回答：为什么XR项目维护成本这么高）

12.  Quest 工程性能优化
    → 移动VR的性能模型
    → Draw Call、Foveated Rendering、Profiler

13. VR 多人同步与 Photon

14.  Unity XR 多平台兼容策略
    → Quest / PCVR / iOS 能共用一套工程吗
    → 哪些可以共用，哪些必须分开

15.  SDK 地狱：为什么升级一次会牵一发动全身
    → 依赖关系为什么这么脆
    → 升级前应该检查什么
    → 这篇放最后，因为读者要先理解前面所有层才能真正理解这篇