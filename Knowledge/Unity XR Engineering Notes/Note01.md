# Unity XR Technology Stack Overview

## Why do Oculus, OpenXR, MRTK, and XRI feel so confusing at first?

> This is the entry note for the Unity XR engineering series. It does not start from a specific SDK API. Instead, it answers a more basic question: where do these SDKs, plugins, runtimes, and interaction frameworks sit in the overall stack?

## Reading Goals

After reading this note, you should at least be able to distinguish these points:

- OpenXR is a standard, not a Unity interaction framework.
- Oculus XR Plugin / OpenXR Plugin are bridges between Unity and the XR runtime.
- XRI, MRTK, and Meta Interaction SDK belong to the interaction layer. They are not the runtime itself.
- Meta Core SDK, All-in-One, and MR Utility Kit are closer to platform capability packages.
- Many XR issues are not single API issues. They are coordination problems between Runtime, Plugin, Input, Rendering, Platform SDK, and Interaction layers.

## Contents

- [Unity XR Technology Stack Overview](#unity-xr-technology-stack-overview)
  - [Why do Oculus, OpenXR, MRTK, and XRI feel so confusing at first?](#why-do-oculus-openxr-mrtk-and-xri-feel-so-confusing-at-first)
  - [Reading Goals](#reading-goals)
  - [Contents](#contents)
  - [Why XR Development Is More Complex Than It First Looks](#why-xr-development-is-more-complex-than-it-first-looks)
  - [The Key to Understanding the XR Ecosystem](#the-key-to-understanding-the-xr-ecosystem)
    - [Unity XR Stack Layers](#unity-xr-stack-layers)
    - [1. Hardware Device Layer](#1-hardware-device-layer)
    - [2. Runtime Layer](#2-runtime-layer)
    - [3. Unity XR Plugin Layer](#3-unity-xr-plugin-layer)
    - [4. Platform SDK Layer](#4-platform-sdk-layer)
    - [5. Interaction Layer](#5-interaction-layer)
    - [6. Application Layer](#6-application-layer)
  - [The Transition Between Old and New XR Architectures](#the-transition-between-old-and-new-xr-architectures)
  - [Why XR Is Especially Painful for Newcomers](#why-xr-is-especially-painful-for-newcomers)
  - [Summary](#summary)

When I first started working on Unity XR projects, the most common problem was not how to use a specific API. The real problem was that the ecosystem had too many names and too many frameworks mixed together. For a long time, I did not know how these pieces related to each other.

Oculus Integration, OpenXR, Meta XR SDK, MRTK2, MRTK3, XRI, Meta Core, All-in-One... all of these names sound like some kind of "XR SDK". But once you enter a real project, you quickly realize that they are not at the same layer at all.

Some are low-level runtime standards. Some are Unity plugins. Some are interaction frameworks. Some are just collections of Meta platform capabilities.

The problem is that official documentation usually tells you how to use something, but rarely tells you where it sits in the whole XR stack.

That is why many developers who are new to XR feel like the ecosystem is just a chaotic pile of SDKs.

But Unity XR is not simply "messy". It has gone through several architectural transitions over the past few years.

## Why XR Development Is More Complex Than It First Looks

Many Unity developers do not immediately realize how XR differs from ordinary Unity 3D at the architectural level.

From the Unity Editor's point of view, an XR project can look very similar to a normal Unity 3D project at first: an XR Rig, left and right eye cameras, VR controller input, and a few XR SDKs.

So when I first started, I also naturally thought:

> `XR = Unity3D + VR Camera`

But once you start working on real projects, you quickly find that the biggest difference is not just display output. The entire runtime logic changes.

The main complexity of XR is that it is not a single framework. It is a combined ecosystem across devices, runtimes, platforms, and interaction systems.

In a normal Unity 3D project, you often focus on game logic, rendering, input, and UI.

In XR, even something as simple as "the controller button does not respond" may involve many different systems.

For example, in a Quest project, the visible symptom may be only:

> Pressing the controller button does nothing.

But behind that symptom, the cause may involve Unity Input System, XRI Actions, OpenXR Features, controller profiles, or SDK version compatibility.

So the hard part in many XR issues is not a single API. It is the relationship between multiple systems.

What makes XR more complex is that it connects systems that used to be relatively separate into one real-time spatial interaction system.

- The camera is no longer just a rendering viewpoint. It is bound to head tracking.
- Input is no longer just keyboard and mouse. It includes controllers, hand tracking, eye tracking, and spatial input.
- UI is no longer fixed to screen space. It enters 3D space and user-scale interaction.
- XR Rig affects world coordinates, height, locomotion, and interaction origins.
- Passthrough, MR, and Spatial Anchors further affect rendering, spatial understanding, and platform permissions.

In other words, XR is not just adding a "VR mode". It connects input, rendering, spatial coordinates, device tracking, runtime behavior, and platform capabilities into one real-time system.

Sometimes the final cause is not a Unity logic bug at all. It may be a behavior change after a Quest Runtime update.

So this note does not go into specific APIs first. It starts by building a map: what belongs to the runtime, what belongs to Unity plugins, what belongs to interaction frameworks, and what is platform capability.

## The Key to Understanding the XR Ecosystem

The most important point is this:

Do not understand Unity XR by SDK names. Understand it by layers.

Understanding system structure and layer boundaries is also a common step in engineering growth.

### Unity XR Stack Layers

Once I started thinking in layers, the whole XR ecosystem became much clearer.

At a high level, the stack can be split like this:

| Layer | Typical Examples | Main Responsibility |
| --- | --- | --- |
| Hardware Device Layer | Quest, Vision Pro, Pico, HoloLens | Display, sensors, controllers, cameras, tracking hardware |
| Runtime Layer | Meta Runtime, SteamVR Runtime | Device tracking, rendering submission, spatial system, runtime environment |
| Unity XR Plugin Layer | OpenXR Plugin, Oculus XR Plugin, XR Plugin Management | Connect Unity XR subsystems to a concrete runtime |
| Platform SDK Layer | Meta Core SDK, All-in-One, MR Utility Kit | Platform-specific capabilities such as Passthrough, Anchors, Scene API |
| Interaction Layer | XRI, MRTK2, MRTK3, Meta Interaction SDK | Ray, grab, teleport, UI, controller and hand interaction |
| Application Layer | Games, industrial systems, XR applications | Business logic, scene content, product experience |

The relationship between Platform SDK and Interaction is especially important.

From my engineering experience, Platform SDK is the platform capability layer above XR Plugin. It provides platform-specific capabilities that later support the interaction layer and the application layer. Interaction looks like an independent layer because it is large and important enough to deserve its own mental model.

If we describe it strictly by layers, it looks like this:

```text
Hardware Device Layer
  ↓
Runtime Layer
  ↓
Unity XR Plugin Layer
  ↓
Platform SDK Layer
  ↓
Interaction Layer
  ↓
Application Layer
```

Or more precisely, Interaction is like layer 4.5 / layer 5: it sits above platform capabilities and directly serves the application layer.

The key point is that many beginners treat all of these as ***"XR SDKs"***

But their responsibilities are very different.

### 1. Hardware Device Layer

This layer is easy to understand: Quest 2 / 3, Vision Pro, Pico, HoloLens, and so on.

These are real devices, but Unity does not communicate directly with the device hardware. There is a runtime in between.

### 2. Runtime Layer

A runtime can be understood as "device driver + XR runtime environment".

Examples include Meta Runtime, SteamVR Runtime or Meta Quest Link.

Unity does not talk directly to Quest. The relationship is more like this:

```text
Unity Application
    ↓
Unity OpenXR Plugin / Oculus XR Plugin
    ↓
Meta OpenXR Runtime
    ↓
Quest OS / Tracking / Device
```

When you enable OpenXR Plugin in Unity, it does not mean Quest stops using Meta Runtime.

On Quest, there is still one runtime system: Meta's runtime.

The difference is:

| Plugin | Access Path | Better Fit |
| --- | --- | --- |
| Oculus XR Plugin | Accesses the runtime more through Meta private interfaces | Older Quest projects deeply tied to Oculus Integration / OVRInput |
| OpenXR Plugin | Accesses the same runtime through the OpenXR standard interface | New projects, multi-platform projects, projects that want less vendor lock-in |

So there are not two runtimes running side by side. The same runtime exposes both private interfaces and OpenXR interfaces.

Unity OpenXR Plugin is responsible for connecting Unity XR systems to the OpenXR runtime interface.

This is why even if your Unity project uses OpenXR, the final runtime path still goes through Meta Runtime and Quest's lower-level tracking, rendering, and device systems.

It is also why project behavior can change after a Quest Runtime update, even if you did not change your Unity project.

Understanding the relationship between Runtime, Tracking, Rendering, and Device Systems is one of the big differences between XR engineering and ordinary Unity 3D development.

### 3. Unity XR Plugin Layer

This is the layer many developers first encounter directly.

Examples include XR Plugin Management, OpenXR Plugin, and Oculus XR Plugin.

Their job is to let Unity connect to the runtime.

The most confusing part of this layer is the relationship between Oculus XR Plugin and OpenXR Plugin.

Historically, Oculus XR was more of Meta's private solution. OpenXR came later as an industry standard intended to unify interfaces across XR devices and runtimes.

In short:

| Direction | Characteristics |
| --- | --- |
| Oculus XR | More vendor-ecosystem oriented. Can access some Meta-specific capabilities earlier |
| OpenXR | More standard and cross-platform. Better for long-term maintenance and multi-device compatibility |

On Quest, both plugins can often work because both eventually connect to Meta Runtime.

But they are not equivalent. Oculus XR Plugin is more tied to Meta's private ecosystem, while OpenXR Plugin is more standard and cross-platform. Some Meta-specific capabilities may require OpenXR Extensions or additional Meta SDK packages.

For Quest projects, old projects often make more sense staying on Oculus Plugin. New projects are usually better candidates for gradually moving toward OpenXR.

Many large old projects are already deeply tied to Oculus Integration, OVRInput, and historical runtime logic. In that situation, switching from Oculus Plugin to OpenXR is not just "changing a plugin". It is closer to an XR architecture migration.

Outside Quest, such as Pico or SteamVR environments, OpenXR's cross-platform advantage becomes more obvious.

Many people mistakenly think:

> `OpenXR = a Unity XR framework`

But OpenXR is closer to a standard interface.

Unity's OpenXR Plugin is Unity's implementation of OpenXR integration.

For this first note, the main thing to remember is:

XR Plugin is not an ordinary feature package. It is the bridge between Unity Engine and the XR Runtime.

### 4. Platform SDK Layer

Platform SDK is the platform capability layer above XR Plugin.

It is not the interaction framework itself. Instead, the platform packages its own capabilities so Unity projects can use them. This layer supports both the interaction layer and the application layer above it.

Many people think Meta SDK itself is the "XR foundation framework", but it is closer to a collection of platform capabilities.

Examples include Meta XR SDK, Meta All-in-One, Meta Core SDK, and MR Utility Kit.

These packages often have similar names, overlapping functionality, and complicated version relationships.

So many beginners ask:

> Which one should I install?

In practice, these are more like platform capability packages. They are not all "core XR capabilities". Many of them are Meta-specific platform capabilities.

One common point of confusion is the relationship between All-in-One and Core SDK.

Simply put, All-in-One is more like a complete package set provided by Meta, while Core SDK is closer to the lower-level foundation and dependency layer.

Many new projects now tend toward:

**`OpenXR + Meta Core SDK + feature modules as needed`**

instead of importing the full Oculus Integration or a large All-in-One package by default.

Camera API, MR Capture, Android permissions, SDK upgrades, and related topics will be covered in later notes.

### 5. Interaction Layer

The Interaction layer is built above XR Plugin and Platform SDK. It is responsible for how users interact with spatial content.

This is where controllers, UI, ray interaction, grabbing, teleportation, and hand tracking become central.

A simple way to understand it:

| Framework | What It Is Closer To |
| --- | --- |
| XRI | Unity's official XR interaction abstraction layer |
| MRTK2 | Microsoft's earlier, more complete MR development framework |
| MRTK3 | A newer MRTK version closer to XRI / OpenXR |
| Meta Interaction SDK | Interaction capabilities based on the Meta platform ecosystem |

Interaction is easy to mix up with Platform SDK because many interaction features depend on platform-specific capabilities. For example, Hand Tracking, Passthrough Interaction, Scene Understanding, and Spatial Anchor related interactions may all require underlying platform SDK support.

But in terms of responsibility:

- Platform SDK answers: what capabilities does this platform provide?
- Interaction answers: how does the user use those capabilities to interact with content?

### 6. Application Layer

The application layer is your game, industrial system, training application, or MR tool.

This layer uses both interaction frameworks and platform capabilities, but it should avoid coupling too directly to runtime-level details. Otherwise, future SDK migrations, OpenXR Feature changes, or multi-platform support will become much more expensive.

## The Transition Between Old and New XR Architectures

The biggest source of confusion for many XR developers is not that they do not know how to use one specific SDK. It is that the whole industry is still in a transition between old and new architectures.

In many projects, Oculus Integration, OpenXR, Legacy Input, Input System, MRTK2, and XRI can all exist at the same time.

These technologies do not all belong to the same generation.

Over the past few years, Unity XR has generally been moving in these directions:

| Old Direction | New Direction |
| --- | --- |
| Private ecosystem | Standardization |
| Single platform | Multi-platform |
| Custom framework stacks | Modular architecture |

## Why XR Is Especially Painful for Newcomers

Unity XR sits right in the middle of this shift:

> Old era -> new era

So if you are working in a large Unity XR project team, you may see all of these at the same time:

| Old Ecosystem | New Ecosystem |
| --- | --- |
| Oculus Integration | OpenXR |
| Legacy Input | Input System |
| MRTK2 | MRTK3 |
| OVRInput | XRI Actions |
| Vendor private interfaces | OpenXR standard |
| Single platform | Multi-platform |

The problem is that many old projects are still maintained today.

So in real large-scale XR projects, you often see:

> `new architecture + old SDKs + transition solutions + legacy code`

For example, a Quest project may contain OpenXR, leftover Oculus Integration logic, XRI, some MRTK2 components, and both old and new input systems.

These systems are often not there because someone designed the project that way from the beginning. They are the result of long-term project evolution.

XR projects are also more frequently affected by Unity version changes, SDK compatibility, and platform restrictions.

Many XR SDKs depend on specific Unity versions, and the compatibility between Quest, OpenXR, Android Gradle, and Meta SDKs changes frequently.

Compared with ordinary mobile applications, XR projects often do not have a simple "hot update compatibility" story. A Unity or SDK upgrade can affect the whole project.

That is why dependency relationships in large XR projects are often more complicated than in ordinary Unity projects.

## Summary

The biggest learning barrier in XR is not that one particular API is difficult. It is the lack of system-level understanding.

If you only read isolated tutorials, every SDK looks like something you must learn. But once you understand the stack by Runtime, Plugin, Platform, Interaction, and Application layers, the ecosystem becomes much clearer.

Unity XR is not just "one SDK". It is a system made of devices, runtimes, standards, plugins, input, interaction, and platform capabilities.

Many beginners are confused by Oculus, OpenXR, MRTK, XRI, and Meta SDK not because they lack ability, but because these things do not belong to the same layer.

For me, understanding XR really began when I started thinking in layers. In many cases, the hard part of XR is not a single SDK. It is the boundaries, dependencies, and runtime collaboration between all these systems.

<details>
<summary>References</summary>

- Meta: OpenXR, VrApi, and LibOVR [https://developers.meta.com/horizon/documentation/unity/os-openxr-vrapi/](https://developers.meta.com/horizon/documentation/unity/os-openxr-vrapi/)
- Meta: Oculus All In on OpenXR - Deprecates Proprietary APIs [https://developers.meta.com/horizon/blog/oculus-all-in-on-openxr-deprecates-proprietary-apis/](https://developers.meta.com/horizon/blog/oculus-all-in-on-openxr-deprecates-proprietary-apis/)
- Unity: XR Plugin Architecture [https://docs.unity3d.com/Manual/XRPluginArchitecture.html](https://docs.unity3d.com/Manual/XRPluginArchitecture.html)
- MRTK3 Official GitHub [https://github.com/MixedRealityToolkit/MixedRealityToolkit-Unity](https://github.com/MixedRealityToolkit/MixedRealityToolkit-Unity)
- Microsoft Learn: Migration guide from MRTK2 to MRTK3 [https://learn.microsoft.com/en-us/windows/mixed-reality/mrtk-unity/mrtk3-overview/architecture/mrtk-v2-to-v3](https://learn.microsoft.com/en-us/windows/mixed-reality/mrtk-unity/mrtk3-overview/architecture/mrtk-v2-to-v3)
- Meta: Core SDK Overview [https://developers.meta.com/horizon/documentation/unity/unity-core-sdk/](https://developers.meta.com/horizon/documentation/unity/unity-core-sdk/)
- Meta: All-in-One SDK [https://developers.meta.com/horizon/downloads/package/meta-xr-sdk-all-in-one-upm/](https://developers.meta.com/horizon/downloads/package/meta-xr-sdk-all-in-one-upm/)
- Harmony Studios: OpenXR Workflow in Unity [https://www.harmony.co.uk/insights/open-xr-efficiency-workflow-unity](https://www.harmony.co.uk/insights/open-xr-efficiency-workflow-unity)

</details>
