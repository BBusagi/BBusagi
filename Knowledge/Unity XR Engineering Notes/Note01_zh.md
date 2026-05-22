# Unity XR 技术栈全景图

## 为什么刚接触 XR 的开发者会被 Oculus、OpenXR、MRTK、XRI 搞混？

> 这篇是 Unity XR 工程体系研究笔记的入口文章。它不优先讲某一个 SDK 的 API，而是先回答一个更基础的问题：这些 SDK、Plugin、Runtime、Interaction Framework 到底分别处在什么层级。

## 阅读目标

读完这篇，至少应该能分清下面几件事：

- OpenXR 是标准，不是 Unity 交互框架。
- Oculus XR Plugin / OpenXR Plugin 是 Unity 和 Runtime 之间的桥梁。
- XRI、MRTK、Meta Interaction SDK 属于交互层，不等于底层 Runtime。
- Meta Core SDK、All-in-One、MR Utility Kit 更偏平台能力集合。
- 很多 XR 问题不是单点 API 问题，而是 Runtime、Plugin、Input、Rendering、Platform SDK 之间的协作问题。

## 目录

- [Unity XR 技术栈全景图](#unity-xr-技术栈全景图)
  - [为什么刚接触 XR 的开发者会被 Oculus、OpenXR、MRTK、XRI 搞混？](#为什么刚接触-xr-的开发者会被-oculusopenxrmrtkxri-搞混)
  - [阅读目标](#阅读目标)
  - [目录](#目录)
  - [XR 开发真正复杂的地方](#xr-开发真正复杂的地方)
  - [理解 XR 生态的关键](#理解-xr-生态的关键)
    - [Unity XR 技术栈分层](#unity-xr-技术栈分层)
    - [1. 第一层：硬件设备层](#1-第一层硬件设备层)
    - [2. 第二层：Runtime 层](#2-第二层runtime-层)
    - [3. 第三层：Unity XR Plugin 层](#3-第三层unity-xr-plugin-层)
    - [4. 第四层：Platform SDK 层](#4-第四层platform-sdk-层)
    - [5. 第五层：Interaction 交互层](#5-第五层interaction-交互层)
    - [6. 第六层：应用层](#6-第六层应用层)
  - [新旧 XR 架构的切换](#新旧-xr-架构的切换)
  - [为什么刚接触 XR 的开发者会特别痛苦？](#为什么刚接触-xr-的开发者会特别痛苦)
  - [总结](#总结)

我第一年正式进入 Unity XR 项目时，经常遇到的问题并不是某一个 API 怎么使用，而是整个系统中有太多的名词存在以及不同框架混用，在很长的一段时间里我根本不知道这些东西之间到底是什么关系。

Oculus Integration、OpenXR、Meta XR SDK、MRTK2、MRTK3、XRI、Meta Core、All in One……这些名字看起来都像某种“XR SDK”，但真正进入项目后会发现，它们其实根本不在同一个层级。

有些是底层运行标准，有些是 Unity 插件，有些是交互框架，还有些只是 Meta 平台能力集合。

问题在于，官方文档通常只会告诉你“怎么使用”，却很少告诉你“它在整个 XR 技术栈里到底处于哪一层”。

这也是为什么很多刚接触 XR 的开发者第一次进入项目时，会觉得整个生态像一团混乱的 SDK 拼接物。

但实际上，Unity XR 生态并不是“乱”，而是它在过去几年里经历了多次架构演进。

## XR 开发真正复杂的地方

很多普通 Unity 开发者第一次进入 XR 时，其实并不会立刻意识到 XR 和普通 Unity 3D 在架构层面到底差在哪里。

因为如果从 Unity Editor 的角度来看，XR 项目一开始看起来确实很像普通 Unity 3D 项目：只是多了 XR Rig、左右眼 Camera、VR 手柄输入，以及一些 XR SDK。

所以我自己其实在一开始接触时，也会自然地觉得：`XR = Unity3D + VR Camera`

但真正开始做项目之后，很快就会发现，XR 和普通 Unity 3D 最大的区别并不只是“显示方式”，而是整个系统运行逻辑都发生了变化。

XR 最大的复杂度在于，它不是单一框架，而是一整套跨设备、跨 Runtime、跨平台、跨交互系统的组合生态。

普通 Unity 3D 项目里，你很多时候只需要关注游戏逻辑、渲染、输入和 UI。

但在 XR 里，即使只是一个“手柄按钮没反应”的问题，背后都可能有很多原因。

例如在 Quest 项目中，最后表现出来的现象可能只是：

> 按下手柄按钮没有任何反应。

但背后可能同时涉及 Unity Input System、XRI Action、OpenXR Feature、Controller Profile，甚至 SDK 版本兼容。

所以 XR 项目中的很多问题，真正困难的地方并不在于“某个 API”，而在于多个系统之间的关系。

真正让 XR 更复杂的地方在于：它同时把很多原本分开的系统耦合到了“实时空间交互”里。

- Camera 不再只是渲染视角，而是直接绑定用户头部追踪。
- 输入不再只是鼠标键盘，而是手柄、手部追踪、眼动、空间输入等设备状态。
- UI 不再只固定在屏幕空间，而是进入三维空间和用户身体尺度。
- XR Rig 会影响世界坐标系、身高、移动方式和交互原点。
- Passthrough、MR、Spatial Anchor 又会进一步影响渲染、空间理解和平台权限。

也就是说，XR 不是简单增加一个“VR 模式”，而是把输入、渲染、空间坐标、设备追踪、Runtime 与平台能力全部连接到了同一个实时系统里。

甚至有时候，问题最后并不是 Unity 逻辑错误，而是 Quest Runtime 更新后导致行为发生变化。

所以这篇文章先不进入具体 API，而是先建立一张地图：哪些东西属于 Runtime，哪些属于 Unity Plugin，哪些属于交互框架，哪些又只是平台能力。

## 理解 XR 生态的关键

理解 Unity XR 生态时，最重要的一点是：不要按“SDK 名字”理解，而要按“层级”理解。

实际上，理解系统构造与层级关系，本身也是大多数工程师成长过程中都会经历的一步。

### Unity XR 技术栈分层

后来我发现，只要开始按“层”去理解，整个 XR 生态会突然清晰很多。

大致可以拆成下面几层：

| 层级 | 典型对象 | 主要职责 |
| --- | --- | --- |
| 硬件设备层 | Quest、Vision Pro、Pico、HoloLens | 提供显示、传感器、控制器、相机、追踪硬件 |
| Runtime 层 | Meta Runtime、SteamVR Runtime| 管理设备追踪、渲染提交、空间系统和运行环境 |
| Unity XR Plugin 层 | OpenXR Plugin、Oculus XR Plugin、XR Plugin Management | 把 Unity XR 子系统接入具体 Runtime |
| Platform SDK 层 | Meta Core SDK、All-in-One、MR Utility Kit | 提供平台特有能力，例如 Passthrough、Anchor、Scene API |
| Interaction 交互层 | XRI、MRTK2、MRTK3、Meta Interaction SDK | 处理 Ray、Grab、Teleport、UI、手柄和手部交互 |
| 应用层 | 游戏、工业系统、XR 应用 | 实现业务逻辑、场景内容和产品体验 |

这里需要特别注意 Platform SDK 和 Interaction 的关系。

从工程经验上看，Platform SDK 更像是 XR Plugin 之上的平台能力层，它为后续的交互层和应用层提供平台特有能力。Interaction 之所以看起来像独立一层，是因为它的内容足够大、足够重要，通常需要单独拆出来理解。

所以如果严格按层级看，可以理解为：

```text
硬件设备层
  ↓
Runtime 层
  ↓
Unity XR Plugin 层
  ↓
Platform SDK 层
  ↓
Interaction 交互层
  ↓
应用层
```

或者更细一点说，Interaction 更像是 4.5 / 第 5 层：它位于平台能力之上，又直接服务于应用层。

这里最重要的是：

很多新人会把这些东西全部当成：***“XR SDK”`***

但其实它们职责完全不同。

### 1. 第一层：硬件设备层

这一层很好理解，例如 Quest 2 / 3、Vision Pro、Pico、HoloLens。

它们是真实设备，但设备本身并不会直接和 Unity 通信，中间还需要 Runtime。

### 2. 第二层：Runtime 层

Runtime 可以理解成“设备驱动 + XR 运行环境”。

例如 Meta Runtime、SteamVR Runtime 还有 Meta Quest Link。

Unity 并不是直接和 Quest 通信。

而是：

```
Unity Application
    ↓
Unity OpenXR Plugin / Oculus XR Plugin
    ↓
Meta OpenXR Runtime
    ↓
Quest OS / Tracking / Device
```

当我们在 Unity 中启用 OpenXR Plugin 时，并不意味着 Quest 不再使用 Meta Runtime。

实际上，在 Quest 上始终只有一套 Runtime，也就是 Meta 自己的 Runtime 系统。

区别在于：

| Plugin | 接入方式 | 更适合的场景 |
| --- | --- | --- |
| Oculus XR Plugin | 更偏通过 Meta 私有接口访问 Runtime | 已经深度绑定 Oculus Integration / OVRInput 的旧 Quest 项目 |
| OpenXR Plugin | 更偏通过 OpenXR 标准接口访问同一个 Runtime | 新项目、多平台项目、希望减少厂商绑定的项目 |

也就是说，并不是两套 Runtime 并存，而是同一个 Runtime 对外同时提供了私有接口与 OpenXR 接口。

而 Unity OpenXR Plugin 的作用，则是负责把 Unity XR 系统接入 OpenXR 标准 Runtime 接口。

所以很多时候，即使你在 Unity 中使用的是 OpenXR，最终运行时仍然会经过 Meta Runtime 与 Quest 的底层 Tracking、Rendering 与 Device System。

这也是为什么，有时候你明明没改 Unity 工程，但 Quest Runtime 更新之后，项目行为也可能发生变化。

所以对 Runtime、Tracking、Rendering 与设备关系的理解，是 XR 工程和普通 Unity 3D 开发一个很大的区别。

### 3. 第三层：Unity XR Plugin 层

这是很多人第一次真正接触到的层。

例如 XR Plugin Management、OpenXR Plugin 与 Oculus XR Plugin。

它们负责“让 Unity 能连接 Runtime”。

这一层最容易混淆的是 Oculus XR Plugin 和 OpenXR Plugin。

早期 Oculus XR 更多是 Meta（当时还是 Oculus）自己的私有方案，而 OpenXR 则是后面逐渐发展起来的行业标准，目标是统一不同 XR 设备与 Runtime 的接口。

也就是说：

| 方向 | 特点 |
| --- | --- |
| Oculus XR | 更偏厂商生态，能较早访问 Meta 私有能力 |
| OpenXR | 更偏跨平台标准，适合长期维护和多设备兼容 |

在 Quest 上，这两套 Plugin 很多时候都能正常运行，因为它们最终仍然会接入 Meta Runtime。

但它们并不完全等价。Oculus XR Plugin 更偏 Meta 私有生态，OpenXR Plugin 更偏标准化和跨平台。部分 Meta 专有能力需要通过 OpenXR Extension 或额外的 Meta SDK 才能访问。

所以对于 Quest 项目来说，老项目通常更适合继续沿用 Oculus Plugin，而新项目则更推荐逐渐转向 OpenXR。

因为很多大型旧项目本身已经深度绑定 Oculus Integration、OVRInput 与历史 Runtime 逻辑。这时候从 Oculus Plugin 切换到 OpenXR，很多时候已经不是“换插件”，而更接近一次 XR 架构迁移。而在 Quest 之外，例如 Pico、SteamVR等设备环境中，OpenXR 的跨平台优势则会更加明显。

很多人会误以为：

> `OpenXR = 一个 Unity XR 框架`

但实际上，OpenXR 本质上更接近一种标准接口。

Unity 里的 OpenXR Plugin，只是 Unity 对 OpenXR 的实现。

本篇先只需要记住一点：XR Plugin 不是普通功能包，而是 Unity Engine 与 XR Runtime 之间的桥梁层。

### 4. 第四层：Platform SDK 层

Platform SDK 是 XR Plugin 之上的平台能力层。

这一层不是交互框架本身，而是平台把自己的能力封装给 Unity 项目使用。它会向上支撑交互层和应用层。

很多人会误以为 Meta SDK 本身就是“XR 基础框架”，但实际上它更偏平台能力集合。

例如 Meta XR SDK、Meta All in One、Meta Core SDK 与 MR Utility Kit。

这些东西经常名字相似、功能重叠、版本关系复杂。

于是很多新人会问：

> 到底该装哪个？

实际上，这些更多是平台能力封装，并不都属于“XR 基础能力”，而是 Meta 平台特有能力。

其中很多人最容易混淆的，其实是 All-in-One 与 Core SDK 的关系。

简单来说，All-in-One 更像 Meta 官方提供的完整功能集合，而 Core SDK 更偏底层基础能力与依赖层。

很多新项目现在其实会逐渐倾向：

**`OpenXR + Meta Core SDK + 按需功能模块`**

而不是过去那种一次性导入完整 Oculus Integration 或大型 All-in-One 包的方式。

至于 Camera API、MR Capture、Android 权限、SDK 升级等问题，会在后续更具体的章节里展开。

### 5. 第五层：Interaction 交互层

Interaction 交互层建立在 XR Plugin 和 Platform SDK 之上，负责“用户如何和空间内容交互”。

这一层才开始真正涉及手柄、UI、Ray、Grab、Teleport 与 Hand Tracking。

简单理解：

| 框架 | 更像什么 |
| --- | --- |
| XRI | Unity 官方 XR 交互抽象层 |
| MRTK2 | 微软早期较完整的 MR 开发框架 |
| MRTK3 | 更贴近 XRI / OpenXR 的新一代 MRTK |
| Meta Interaction SDK | 基于 Meta 平台生态的交互能力 |

Interaction 之所以容易和 Platform SDK 混在一起，是因为很多交互能力会依赖具体平台能力。例如 Hand Tracking、Passthrough Interaction、Scene Understanding、Spatial Anchor 相关交互，都可能需要平台 SDK 提供底层能力。

但从职责上看，Platform SDK 解决的是“平台提供什么能力”，Interaction 解决的是“用户如何使用这些能力和内容交互”。

### 6. 第六层：应用层

应用层就是你的游戏、工业系统、训练应用或 MR 工具。

这一层会同时使用交互框架和平台能力，但它本身应该尽量避免直接和底层 Runtime 细节耦合。否则项目后续迁移 SDK、切换 OpenXR Feature，或者做多平台兼容时，维护成本会非常高。

## 新旧 XR 架构的切换

很多 XR 开发者现在最大的困惑，其实并不是“不会用某个 SDK”，而是整个行业正处于新旧架构切换阶段。

很多时候，一个项目里会同时存在 Oculus Integration、OpenXR、Legacy Input、Input System、MRTK2 与 XRI。

这些并不属于同一个时代的技术体系。

而 Unity XR 生态过去几年的很多变化，本质上也都在围绕下面几个方向演进：

| 旧方向 | 新方向 |
| --- | --- |
| 私有生态 | 标准化 |
| 单平台 | 多平台 |
| 自建体系 | 模块化 |

## 为什么刚接触 XR 的开发者会特别痛苦？

因为 Unity XR 生态刚好经历了：

“旧时代 → 新时代”的切换

所以如果你处在一个大型的UnityXR项目组中你大概会同时看到：

| 旧生态                | 新生态          |
| ------------------ | ------------ |
| Oculus Integration | OpenXR       |
| Legacy Input       | Input System |
| MRTK2              | MRTK3        |
| OVRInput           | XRI Action   |
| 厂商私有接口             | OpenXR 标准    |
| 单平台                | 多平台          |

问题在于，大量旧项目直到今天仍然还在维护。

于是现实里的大型 XR 项目，经常会同时存在：

> `新架构 + 老 SDK + 过渡方案 + 历史遗留`

例如一个 Quest 项目里，可能会同时出现 OpenXR、Oculus Integration 遗留逻辑、XRI、部分 MRTK2 组件，以及新旧 Input System 混用。

这些系统很多时候并不是“设计如此”，而是项目在长期演进过程中逐渐叠加出来的结果。

除此之外，XR 项目通常还会更频繁地受到 Unity 版本变更、SDK 兼容性，以及平台限制的影响。

例如很多 XR SDK 会强依赖特定 Unity 版本，而 Quest、OpenXR、Android Gradle、Meta SDK 之间的兼容关系也经常变化。

相比普通移动应用，XR 项目很多时候并不存在真正意义上的“热更新兼容”，因此一次 Unity 或 SDK 升级，往往就可能影响整个工程。

这也是为什么，大型 XR 项目的依赖关系经常会比普通 Unity 项目更复杂。

## 总结

XR 最大的学习门槛，并不是“某个 API 难”，而是“缺少系统级认知”。

如果只看单个教程，你会觉得“每个 SDK 都像必须学”。但当你开始按 Runtime、Plugin、Interaction、Platform 分层理解之后，整个 XR 生态会突然清晰很多。

Unity XR 并不是单纯的“一个 SDK”，而是一整套由设备、Runtime、标准、插件、输入、交互和平台能力共同组成的系统。

很多刚开始接触的开发者之所以会被 Oculus、OpenXR、MRTK、XRI、Meta SDK 搞混，并不是因为他们理解能力不够，而是因为这些东西原本就不属于同一个层级。

我自己真正开始理解 XR，也是从“按层理解技术栈”开始的。很多时候，XR 真正困难的并不是某一个 SDK，而是这些系统之间的边界、依赖关系，以及它们在 Runtime 中是如何真正协同工作的。

<details>
<summary>参考资料</summary>

- Meta: OpenXR, VrApi, and LibOVR [https://developers.meta.com/horizon/documentation/unity/os-openxr-vrapi/](https://developers.meta.com/horizon/documentation/unity/os-openxr-vrapi/)
- Meta: Oculus All In on OpenXR — Deprecates Proprietary APIs [https://developers.meta.com/horizon/blog/oculus-all-in-on-openxr-deprecates-proprietary-apis/](https://developers.meta.com/horizon/blog/oculus-all-in-on-openxr-deprecates-proprietary-apis/)
- Unity: XR Plugin Architecture [https://docs.unity3d.com/Manual/XRPluginArchitecture.html](https://docs.unity3d.com/Manual/XRPluginArchitecture.html)
- MRTK3 Official GitHub [https://github.com/MixedRealityToolkit/MixedRealityToolkit-Unity](https://github.com/MixedRealityToolkit/MixedRealityToolkit-Unity)
- Microsoft Learn: Migration guide from MRTK2 to MRTK3 [https://learn.microsoft.com/en-us/windows/mixed-reality/mrtk-unity/mrtk3-overview/architecture/mrtk-v2-to-v3](https://learn.microsoft.com/en-us/windows/mixed-reality/mrtk-unity/mrtk3-overview/architecture/mrtk-v2-to-v3)
- Meta: Core SDK Overview [https://developers.meta.com/horizon/documentation/unity/unity-core-sdk/](https://developers.meta.com/horizon/documentation/unity/unity-core-sdk/)
- Meta: All-in-One SDK [https://developers.meta.com/horizon/downloads/package/meta-xr-sdk-all-in-one-upm/](https://developers.meta.com/horizon/downloads/package/meta-xr-sdk-all-in-one-upm/)
- Harmony Studios: OpenXR Workflow in Unity [https://www.harmony.co.uk/insights/open-xr-efficiency-workflow-unity](https://www.harmony.co.uk/insights/open-xr-efficiency-workflow-unity)

</details>
