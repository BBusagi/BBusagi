# Unity XR 技术栈全景图
## 为什么刚接触XR的开发者会被Oculus、OpenXR、MRTK、XRI搞混？

我第一年正式进入 Unity XR 项目时，经常有的问题并不是某一个API怎么使用，而是根本不知道这些东西之间到底是什么关系。

Oculus Integration、OpenXR、Meta XR SDK、MRTK2、MRTK3、XRI、Meta Core、All in One……这些名字看起来都像某种“XR SDK”，但真正进入项目后会发现，它们其实根本不在同一个层级。

有些是底层运行标准，有些是 Unity 插件，有些是交互框架，还有些只是 Meta 平台能力集合。

问题在于，官方文档通常只会告诉你“怎么使用”，却很少告诉你“它在整个 XR 技术栈里到底处于哪一层”。

这也是为什么很多 刚接触 XR 的开发者第一次进入项目时，会觉得整个生态像一团混乱的 SDK 拼接物。

但实际上，Unity XR 生态并不是“乱”，而是它在过去几年里经历了多次架构演进。

## XR 开发真正复杂的地方

很多普通 Unity 开发者第一次进入 XR 时，其实并不会立刻意识到 XR 和普通 PC 3D 在架构层面到底差在哪里。

因为从 Unity Editor 的角度来看，XR 项目一开始看起来确实很像普通 Unity 3D 项目：只是多了 XR Rig、左右眼 Camera、VR 手柄输入，以及一些 XR SDK。

所以很多人，包括我自己第一次接触时，也会自然地觉得：`XR = 在普通 Unity 3D 项目上增加 VR Camera`

但真正开始做项目之后，很快就会发现，XR 和普通 PC 3D 最大的区别并不只是“显示方式”，而是整个系统运行逻辑都发生了变化。

XR 最大的复杂度在于，它不是单一框架，而是一整套跨设备、跨 Runtime、跨平台、跨交互系统的组合生态。

普通 PC 3D 项目里，你很多时候只需要关注游戏逻辑、渲染、输入和 UI。

但在 XR 里，即使只是一个“手柄按钮没反应”的问题，背后都可能有很多原因。

例如在我第一次接触 Quest 项目时，就遇到过一个很典型的问题：手柄按钮完全没有反应。

最后排查下来，原因可能涉及 Unity Input System、XRI Action、OpenXR Feature、Oculus Controller Profile，甚至 Meta SDK 版本冲突。

最后表现出来的现象却只是：

“按下手柄按钮没有任何反应。”

所以我后来学到的是：XR 项目中的很多问题，真正困难的地方并不在于“某个 API”，而在于多个系统之间的关系。

当然，工程领域里“表象问题一路追到系统底层”本身并不是 XR 独有的事情。

真正让 XR 更复杂的地方在于：它同时把很多原本分开的系统耦合到了“实时空间交互”里。

例如在普通 PC 3D 项目中，Camera 更多只是渲染视角，输入通常是鼠标键盘，UI 也基本固定在屏幕空间。

但在 XR 中，Camera 会直接绑定用户头部追踪，双眼渲染会影响整个 Render Pipeline，手柄与手部追踪会进入 Input System，XR Rig 也会直接影响世界坐标系。Passthrough 与 MR 又会进一步影响渲染与空间理解。

也就是说，XR 不是简单增加一个“VR 模式”，而是把输入、渲染、空间坐标、设备追踪、Runtime 与平台能力全部连接到了同一个实时系统里。

所以很多时候，一个看似简单的问题，影响范围会比普通 PC 3D 更广。

例如后来做 MR Capture 时，最初我以为这只是一个“把当前画面截下来”的功能。但真正开始实现后才发现，它并不是普通录屏问题。

当时项目需要基于 Meta 新开放的 Camera API，实现 QR Code 扫描、MR 截图，以及后续的 MR 画面 Streaming。为了使用这些能力，我们必须从较旧且经过定制的 Meta SDK 版本逐步升级，并在 Unity 2021、Quest OS、Android Manifest、Oculus / OpenXR Plugin、Meta Core SDK 之间处理大量兼容性问题。

MR Capture 本身也不是简单读取 XR Camera 的画面。现实相机画面、Passthrough Layer、虚拟物体渲染、RenderTexture、左右眼视差、相机比例关系与 Android 权限都会参与进来。尤其是当我尝试把现实画面和 VR 画面合成为“头显中看到的一致画面”时，问题已经从普通截图变成了一个空间对齐与渲染合成问题。

所以这次经历让我意识到：很多 MR 功能表面上看是应用层功能，但实际实现时会同时牵涉 Runtime、Camera API、Render Pipeline、权限系统和平台 SDK。**XR 工程的难点往往不在于某一个 API 能不能调用，而在于这些系统之间是否真的能在同一个运行环境中稳定协作。**

所以我后来学到的是：很多 XR 功能表面上看是“应用功能”，但本质上其实已经深入到了 Runtime 与空间系统层。

甚至有时候，问题最后并不是 Unity 逻辑错误，而是 Quest Runtime 更新后导致行为发生变化。

我后来其实越来越觉得，Unity XR 开发复杂的一个根本原因在于：Unity 本质上仍然是一个“游戏引擎”，而不是一个真正从零开始为 XR 设计的开发平台。

很多 XR 系统实际上是后续逐渐“加”到 Unity 上的。

例如 XR Rig、OpenXR Plugin、Input System、Passthrough、Hand Tracking、MR、Spatial Anchor 等能力，很多都不是 Unity 最初架构里的核心组成部分，而是随着 XR 行业发展不断叠加进来的。

所以现在的 Unity XR 开发，经常会有一种“把传统游戏引擎强行转换成 XR 开发平台”的感觉。

当然，这并不是说传统 PC 或游戏开发天然就是“弱耦合”的。

现代游戏引擎本身也非常复杂，只不过传统 PC 图形与游戏行业已经发展了几十年。

很多原本复杂的问题，例如 GPU Driver、图形 API、输入系统、渲染管线等，都已经被行业标准和引擎本身逐渐封装与稳定化了。

但 XR 目前还处于快速演进阶段。

很多系统边界其实仍然没有真正稳定下来，例如哪些能力属于 Runtime、Engine、Interaction Layer 或平台 SDK，行业本身也还在不断调整。

所以现在的 XR 开发者，会比传统游戏开发更频繁地直接接触到底层 Runtime、Tracking、空间系统与平台能力。

**相比传统 PC 游戏开发，整个行业其实还缺少一个真正围绕“空间计算”和“实时空间交互”重新设计的原生 XR 引擎生态。**

## 理解 XR 生态的关键

理解 Unity XR 生态时，最重要的一点是：不要按“SDK 名字”理解，而要按“层级”理解。

实际上，理解系统构造与层级关系，本身也是大多数工程师成长过程中都会经历的一步。

#### Unity XR 技术栈

后来我发现，只要开始按“层”去理解，整个 XR 生态会突然清晰很多。

大致可以拆成下面几层：

```
[硬件设备层]
Quest / Vision Pro / Pico / HoloLens

        ↓

[Runtime 层]
Meta Runtime / SteamVR Runtime / WMR Runtime

        ↓

[Unity XR Plugin 层]
OpenXR Plugin
Oculus XR Plugin
XR Plugin Management

        ↓

[Interaction 交互层]
XRI
MRTK2
MRTK3
Meta Interaction SDK
AR Foundation
Snapdragon Spaces

        ↓

[Platform SDK 层]
Meta XR SDK
Meta All in One
Meta Core SDK
MR Utility Kit

        ↓

[应用层]
你的游戏 / 工业系统 / MR 应用
```

这里最重要的是：

很多新人会把这些东西全部当成：

`“XR SDK”`

但其实它们职责完全不同。

### 1. 第一层：硬件设备层

这一层很好理解，例如 Quest 2 / 3、Vision Pro、Pico、HoloLens。

它们是真实设备，但设备本身并不会直接和 Unity 通信，中间还需要 Runtime。

### 2. 第二层：Runtime 层

Runtime 可以理解成“设备驱动 + XR运行环境”。

例如 Meta Runtime、SteamVR Runtime 与 WMR Runtime。

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

这里其实有一个很多新人容易混淆的点。

当我们在 Unity 中启用 OpenXR Plugin 时，并不意味着 Quest 不再使用 Meta Runtime。

实际上，在 Quest 上始终只有一套 Runtime，也就是 Meta 自己的 Runtime 系统。

区别在于：

* Oculus XR Plugin 更偏通过 Meta 私有接口访问 Runtime
* OpenXR Plugin 更偏通过 OpenXR 标准接口访问同一个 Runtime

也就是说，并不是两套 Runtime 并存，而是同一个 Runtime 对外同时提供了私有接口与 OpenXR 接口。

而 Unity OpenXR Plugin 的作用，则是负责把 Unity XR 系统接入 OpenXR 标准 Runtime 接口。

所以很多时候，即使你在 Unity 中使用的是 OpenXR，最终运行时仍然会经过 Meta Runtime 与 Quest 的底层 Tracking、Rendering 与 Device System。

这也是为什么，有时候你明明没改 Unity 工程，但 Quest Runtime 更新之后，项目行为也可能发生变化。

我刚开始工作时，也一直习惯把 Unity Build 称作 “Unity App”。但后来上司经常会纠正我，更准确地说应该是 Runtime。

后来我才慢慢意识到，在 XR 开发里，很多时候 Unity 并不是直接“运行在设备上的 App”，而更像是运行在 XR Runtime 之上的空间内容。

所以我后来学到的是：XR 开发里很多问题，其实已经不仅仅是 Application Layer 的问题，而是 Runtime、Tracking、Rendering 与空间系统共同组成的实时系统问题。

这种对 Runtime、Tracking、Rendering 与设备关系的理解，其实也是 XR 工程和普通 Unity 3D 开发一个很大的区别。

### 3. 第三层：Unity XR Plugin 层

这是很多人第一次真正接触到的层。

例如 XR Plugin Management、OpenXR Plugin 与 Oculus XR Plugin。

它们负责“让 Unity 能连接 Runtime”。

这里其实也涉及 XR 行业过去几年的一次重要变化。

早期 Oculus XR 更多是 Meta（当时还是 Oculus）自己的私有方案，很多能力和接口都高度绑定 Meta Runtime 与 Oculus SDK。

而 OpenXR 则是后面逐渐发展起来的行业标准，目标是统一不同 XR 设备与 Runtime 的接口。

也就是说：

* Oculus XR 更偏厂商生态
* OpenXR 更偏跨平台标准

在 Quest 上，这两套 Plugin 很多时候都能正常运行，因为它们最终仍然会接入 Meta Runtime。

但它们并不完全等价。

Oculus XR Plugin 更偏使用 Meta 私有 API，因此通常能够直接访问全部 Meta 平台能力。

而 OpenXR Plugin 则更偏通过标准化接口接入 Runtime，部分 Meta 专有能力则需要通过 OpenXR Extension 才能访问。

因此很多 Meta 新功能，往往会先在 Oculus / Meta 私有接口中出现，之后才逐渐演进为 OpenXR Extension。

例如 Passthrough、Scene API、Eye Tracking 等能力，都经历过类似过程。

不过随着近几年 OpenXR Extension 的不断完善，目前大部分核心 XR 能力实际上已经能够通过 OpenXR 正常访问。

Meta 私有接口现在更多集中在：

* Camera API 深度访问
* Avatar
* Voice
* 刚发布的新功能窗口期

这些更强平台绑定的能力上。

所以对于 Quest 项目来说，老项目通常更适合继续沿用 Oculus Plugin，而新项目则更推荐逐渐转向 OpenXR。

因为很多大型旧项目本身已经深度绑定 Oculus Integration、OVRInput 与历史 Runtime 逻辑。

这时候从 Oculus Plugin 切换到 OpenXR，很多时候已经不是“换插件”，而更接近一次 XR 架构迁移。

而在 Quest 之外，例如 Pico、SteamVR、WMR 等设备环境中，OpenXR 的跨平台优势则会更加明显。

很多人会误以为：

`OpenXR = 一个 Unity XR 框架`

但实际上，OpenXR 本质上更接近一种标准接口。

Unity 里的 OpenXR Plugin，只是 Unity 对 OpenXR 的实现。

这里还有一个很多新人容易疑惑的问题：为什么 Unity 不直接原生支持 XR，而需要额外的 XR Plugin Management？

很多人一开始会觉得，这是不是只是一个简单的“接口转换层”或者“插件管理器”。

但实际上，XR Plugin 负责的事情比想象中更多。

它不仅需要处理 Runtime 连接，还需要参与 Tracking、Stereo Rendering、XR Input、设备生命周期等一整套 XR 子系统接入。

某种程度上，它更像是 Unity Engine 与 XR Runtime 之间的桥梁层。

而 Unity 之所以没有直接把这些能力写死在 Engine Core 中，一个很大的原因也在于 XR 行业本身仍然处于快速演进阶段。

不同 Runtime、设备与平台能力之间的差异非常大，所以 Unity 最后选择了模块化 Plugin 架构。

这部分背后其实还有很多更底层的 Engine Architecture 设计问题，但本篇先只建立一个基础的系统层级理解。

### 4. 第四层：Interaction（交互层）

这一层才开始真正涉及手柄、UI、Ray、Grab、Teleport 与 Hand Tracking。

例如 XRI、MRTK2、MRTK3 与 Meta Interaction SDK。

这层也是最容易“百家争鸣”的地方。

因为：

不同框架的理念其实差异很大。

#### XRI

XRI（XR Interaction Toolkit）本质上是 Unity 官方 XR 交互抽象层。

它的核心目标是：

`统一 XR 交互逻辑`

例如 Grab、Ray、Teleport、Socket 与 Input Action。

这些交互能力。

但理解 XRI 时，还有一个很多新人容易忽略的背景。

在 XRI 出现之前，Unity XR 长期其实并不存在真正统一的 XR Interaction Framework。

很多项目会直接基于 Oculus Integration、OVRInput、SteamVR Plugin 与 Legacy Input

分别实现自己的 XR 输入与交互逻辑。

这也是为什么早期 XR 项目经常会深度绑定某一个平台生态。

而后来 Unity 开始逐渐推动 Input System、XRI 与 OpenXR 这一整套新范式。

其中影响最大的，其实就是 Input System 的变化。

过去 Legacy Input 更偏传统输入逻辑，例如键盘、鼠标与固定设备输入。

但 XR 中的输入本身是动态的。

例如左右手控制器、Hand Tracking、Eye Tracking、Spatial Input 与 Runtime Device Mapping。

这些能力很难继续用传统 Legacy Input 的方式长期维护。

所以后来 Unity 开始逐渐把 XR 输入体系统一到：

`Input System + XRI`

这一套结构上。

XRI 现在实际上也已经逐渐变成 Unity XR 的基础交互层。


#### MRTK2

MRTK2 则更像。

很多企业 XR / MR 项目直到今天仍 heavily 依赖 MRTK2，尤其是在 HoloLens 和早期企业 MR 项目中，这也是为什么很多开发者即使已经进入 OpenXR 时代，仍然需要理解 MRTK2 的设计方式。

“微软的一整套 MR 开发框架”

它不仅提供 Interaction、UI 与 Input

甚至还包括 Solver、Spatial Awareness、Hand Menu 与 Diagnostics。

问题在于，MRTK2 太“大而全”了。

很多系统实际上等于重新实现了一套自己的 XR 架构。

这导致它与 Unity 官方生态割裂、与 OpenXR 时代逐渐不兼容，同时升级也会越来越困难。


#### MRTK3

而 MRTK3 最大的变化就是，它不再试图自己重做 XR 系统，而是开始基于 XRI。

所以我后来学到的是：XR 行业本身也在逐渐从“各家自建体系”走向“标准化 + 模块化”的方向。

这一点其实非常重要。

因为这代表：

整个 XR 生态开始逐渐统一到：

`OpenXR + XRI`

这个组合上。

我自己后来也经历过一次 MRTK2 到 MRTK3 的迁移。

表面上看，这像是一次普通 SDK 升级，但实际开发时会发现，它本质上更接近一次交互架构迁移。

因为 MRTK2 时代很多项目都会深度依赖 MRTK Input System、Pointer、Solver、Hand Menu 与 Spatial Awareness 等 MRTK 自己实现的系统。

这些 MRTK 自己实现的系统。

但到了 MRTK3，很多底层开始逐渐转向：

`Input System + XRI + OpenXR`

这一套 Unity 官方体系。

所以迁移过程中，最常见的问题其实并不是“API 改名”，而是 Input Action 重构、Pointer / Ray 行为变化、Hand Interaction 差异、XR Rig 与 Playspace 结构变化、Legacy MRTK Component 不兼容，以及 OpenXR Feature 配置问题。

很多时候，一个原本在 MRTK2 中正常工作的 Interaction，在 MRTK3 中会因为底层 Input 或 XRI Interaction Layer 的变化而出现行为差异。

所以我后来学到的是：MRTK3 并不只是 MRTK2 的“新版本”，它本质上代表的是微软也开始逐渐回归 Unity 官方 XR 生态。

### 5. 第五层：Platform SDK 层

这一层是很多 Quest 开发者最容易混乱的地方。

很多新人会误以为 Meta SDK 本身就是“XR 基础框架”，但实际上它和前面的 Interaction Layer 并不是同一个层级。

例如 Meta XR SDK、Meta All in One、Meta Core SDK 与 MR Utility Kit。

这些东西经常名字相似、功能重叠、版本关系复杂。

于是很多新人会问：

`“到底该装哪个？”`

实际上，这一层更多是平台能力封装。

例如 Passthrough、Spatial Anchor、Scene API、Avatars、Voice SDK 与 MR Utility Kit。

这些并不属于“XR 基础能力”，而是 Meta 平台特有能力。

其中很多人最容易混淆的，其实是 All-in-One 与 Core SDK 的关系。

简单来说，All-in-One 更像 Meta 官方提供的完整功能集合，而 Core SDK 更偏底层基础能力与依赖层。

很多新项目现在其实会逐渐倾向：

`OpenXR + Meta Core SDK + 按需功能模块`

而不是过去那种一次性导入完整 Oculus Integration 或大型 All-in-One 包的方式。

Meta 后来开始逐渐拆包，本质上也是因为 XR 功能越来越多。

Passthrough、MR、Scene API、Voice、Spatial Anchor、Avatars 等能力，并不一定所有项目都需要。

如果全部强绑定在一个大型 SDK 中，长期维护、版本兼容与 Unity 升级都会越来越困难。

这一点我在项目里感受非常深。

为了使用 Meta 新开放的 Camera API，我们需要从一个经过长期定制的旧版 SDK 开始逐步升级。

过程中不仅经历了多个 Meta SDK 大版本迁移，还需要同时处理 Unity 2021、Quest OS、Android Manifest、OpenXR / Oculus Plugin、Gradle 与 Meta Core SDK 之间的兼容关系。

甚至在开发过程中，由于 Quest OS 更新，原本能够正常申请的 Camera 权限突然失效。

最终一路排查后才确认，需要继续把 Meta Core SDK 从 v81 升级到 v83 才能恢复正常。

而更麻烦的是，这些问题很多时候并不会明确写在官方文档里。

有些问题只能通过 Release Note 追踪、实机测试、社区 Issue、Runtime Debug 与多版本对比逐步确认。

所以我后来学到的是：在大型 XR 项目中，SDK 从来不只是“功能包”，它本身就是整个 Runtime 与平台系统的一部分。

很多时候，一个 SDK Upgrade，本质上已经接近一次系统级迁移。

## 新旧 XR 架构的切换

很多 XR 开发者现在最大的困惑，其实并不是“不会用某个 SDK”，而是整个行业正处于新旧架构切换阶段。

很多时候，一个项目里会同时存在 Oculus Integration、OpenXR、Legacy Input、Input System、MRTK2 与 XRI。

这些并不属于同一个时代的技术体系。

而 Unity XR 生态过去几年的很多变化，本质上也都在围绕：

`私有生态 → 标准化`

`单平台 → 多平台`

`自建体系 → 模块化`

这一方向演进。

## 为什么 刚接触 XR 的开发者会特别痛苦？

因为 Unity XR 生态刚好经历了：

“旧时代 → 新时代”的切换

你会同时看到：

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

`新架构 + 老SDK + 过渡方案 + 历史遗留`

例如一个 Quest 项目里，可能会同时出现 OpenXR、Oculus Integration 遗留逻辑、XRI、部分 MRTK2 组件，以及新旧 Input System 混用。

这些系统很多时候并不是“设计如此”，而是项目在长期演进过程中逐渐叠加出来的结果。

除此之外，XR 项目通常还会更频繁地受到 Unity 版本变更、SDK 兼容性，以及平台限制的影响。

例如很多 XR SDK 会强依赖特定 Unity 版本，而 Quest、OpenXR、Android Gradle、Meta SDK 之间的兼容关系也经常变化。

相比普通移动应用，XR 项目很多时候并不存在真正意义上的“热更新兼容”，因此一次 Unity 或 SDK 升级，往往就可能影响整个工程。

这也是为什么，大型 XR 项目的依赖关系经常会比普通 Unity 项目更复杂。

XR 最大的学习门槛，并不是“某个 API 难”，而是“缺少系统级认知”。

如果只看单个教程，你会觉得“每个 SDK 都像必须学”。但当你开始按 Runtime、Plugin、Interaction、Platform 分层理解之后，整个 XR 生态会突然清晰很多。

## 总结

Unity XR 并不是单纯的 `“一个 SDK”`。

而是一整套：

* 设备
* Runtime
* 标准
* 插件
* 输入
* 交互
* 平台能力

共同组成的系统。

很多新人之所以会被：

* Oculus
* OpenXR
* MRTK
* XRI
* Meta SDK

搞混，

并不是因为他们理解能力不够。

而是因为：

这些东西原本就不属于同一个层级。

而我自己真正开始理解 XR，也是从“按层理解技术栈”开始的。

很多时候，XR 真正困难的并不是某一个 SDK，而是这些系统之间的边界、依赖关系，以及它们在 Runtime 中是如何真正协同工作的。

<details>
<summary> References</summary>

* Meta: OpenXR, VrApi, and LibOVR [https://developers.meta.com/horizon/documentation/unity/os-openxr-vrapi/](https://developers.meta.com/horizon/documentation/unity/os-openxr-vrapi/)

* Meta: Oculus All In on OpenXR — Deprecates Proprietary APIs [https://developers.meta.com/horizon/blog/oculus-all-in-on-openxr-deprecates-proprietary-apis/](https://developers.meta.com/horizon/blog/oculus-all-in-on-openxr-deprecates-proprietary-apis/)

* Unity: XR Plugin Architecture [https://docs.unity3d.com/Manual/XRPluginArchitecture.html](https://docs.unity3d.com/Manual/XRPluginArchitecture.html)

* MRTK3 Official GitHub [https://github.com/MixedRealityToolkit/MixedRealityToolkit-Unity](https://github.com/MixedRealityToolkit/MixedRealityToolkit-Unity)

* Microsoft Learn: Migration guide from MRTK2 to MRTK3 [https://learn.microsoft.com/en-us/windows/mixed-reality/mrtk-unity/mrtk3-overview/architecture/mrtk-v2-to-v3](https://learn.microsoft.com/en-us/windows/mixed-reality/mrtk-unity/mrtk3-overview/architecture/mrtk-v2-to-v3)

* Meta: Core SDK Overview [https://developers.meta.com/horizon/documentation/unity/unity-core-sdk/](https://developers.meta.com/horizon/documentation/unity/unity-core-sdk/)

* Meta: All-in-One SDK [https://developers.meta.com/horizon/downloads/package/meta-xr-sdk-all-in-one-upm/](https://developers.meta.com/horizon/downloads/package/meta-xr-sdk-all-in-one-upm/)

* Harmony Studios: OpenXR Workflow in Unity [https://www.harmony.co.uk/insights/open-xr-efficiency-workflow-unity](https://www.harmony.co.uk/insights/open-xr-efficiency-workflow-unity)

</details>