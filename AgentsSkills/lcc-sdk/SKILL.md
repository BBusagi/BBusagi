---
name: lcc-sdk
description: Integrate, debug, or refactor XGrids LCC SDK usage in Unity projects, especially WHITEROOM-style loaders built around LCCManager, LCCCore.Renderer.Load, bounds syncing, camera/FOV registration, streaming vs full rendering, multi-camera (AddCamera) rendering, clipping, collision, or point-cloud/LCC render mode switching. Use when a task needs to inspect or implement LCC loading flows, renderer lifecycle, transform correction, SDK API calls (WRLCCRenderer / LccObject / LccRenderConfig), local package resolution, or diagnosing LCC display problems (blank model, scattered splats, wrong orientation/scale).
---

# LCC SDK

## Overview

Use this skill to work on Unity-side LCC SDK integration. Keep the skill focused on the app's integration layer: loader flow, transform conventions, renderer lifecycle, bounds propagation, camera/FOV sync, and runtime scene controls. Read the detailed API list in [references/lcc-sdk-api.md](references/lcc-sdk-api.md) only when a task depends on a specific SDK method.

## Quick Start

1. Identify the integration layer first.
   In WHITEROOM this usually means `LccObject`, `WRLCCRenderer`, `LccPackageResolver`, `LccObjectFactory`, and the caller in `PlaceableObject`.
2. Confirm what the app owns versus what the SDK owns.
   The SDK renders LCC scenes and exposes scene APIs. The app owns prefab flow, path preparation, transform correction, scale normalization, object lifecycle, and UI/state sync.
3. Prefer SDK callbacks and APIs over local guesses.
   For example, use `GetBounds()` after load instead of parsing metadata when the SDK already exposes AABB.
4. Keep changes narrow.
   Touch the LCC branch only unless the user explicitly asks to align PointCloud and LCC behavior together.

## Integration Rules

### Loading

- Obtain the renderer through `LCCManager.GetRender(...)`.
- Pass an absolute path to `meta.lcc` or another SDK-supported entry file.
- Call `Load(path, platformType, callback)` on the renderer.
- Treat the load callback as the safe place to pull post-load scene state such as bounds.
- If the project supports packaged `.lcc` archives, keep package resolution outside the renderer wrapper.

### Transform Ownership

- Keep business transform on the parent scene object.
- Apply SDK coordinate-system correction only on the render-root child.
- When working with XGRIDS/LCC Studio-style data, the common correction is:
  - rotate `-90` degrees on X
  - mirror X scale with `(-1, 1, 1)`
- Do not spread these corrections across multiple layers unless there is a verified reason.

### Bounds And Default Scale

- Use `Renderer.GetBounds(out max, out min)` after load to compute scene size.
- Convert the returned AABB into Unity `Bounds`.
- If the app normalizes 3D content into a 1m manipulation box, compute default scale from the largest bounds axis.
- Update app-side object state from this result, not vice versa.

### Camera And FOV

- Prefer the app's active projection camera, not blindly `Camera.main`, when the app has its own camera cache.
- Use `LCCManager.SetFOV(...)` when the SDK needs explicit projection refresh, especially in XR or custom render flows.
- Add or remove extra cameras only if the project genuinely uses multi-camera rendering. Avoid carrying debug camera registration code unless it is proven necessary.

### Renderer Lifecycle

- The SDK provides `Load()` and `Dispose()`, not a separate unload API.
- Repeated `Load()` calls replace the previous rendered scene.
- On app-side teardown, clear callbacks, dispose the renderer, and remove references from the wrapper object.

## Rendering Modes And Multi-Camera (Critical)

The SDK has two rendering strategies, and mixing streaming with multi-camera setups fails silently — the model renders as a sparse scatter of splats with no exception.

- **Full rendering**: all splats resident; every registered camera projects them correctly. Enabled by `Renderer.SetRenderAll(true)` OR automatically when total splats are below the manager threshold (`SetMaxRenderSplat`, SDK full-render default 15,000,000).
- **Streaming / block rendering**: splats are streamed on demand for a *single* camera viewpoint. You get this when `SetRenderAll(false)` and the model exceeds the threshold (e.g. `SetMaxRenderSplat(1)` forces streaming for everything).

Single-viewpoint facts that make streaming fragile with extra cameras:

- `LCCManager.SetFOV(...)` sets ONE global projection; the app feeds it the main/first-person camera.
- `SetMaxSplats()` / `SetMaxDistance()` apply ONLY to streaming/block rendering and select splats by distance/LOD from that viewpoint. A far or top-down camera sits beyond `MaxDistance`, so it receives almost nothing.
- `SetMaxRenderSplat()` is global — it affects EVERY scene on the manager.
- The MainCamera-tagged camera is auto-registered; `AddCamera()` is only for EXTRA cameras. Do not manually add/remove the main camera unless proven necessary.

**Observed in WHITEROOM:** forcing streaming (`LccObject` → `WRLCCRenderer.SetForceStreamingModeForRuntimeControls(true)` → `SetRenderAll(false)`, `SetMaxRenderSplat(1)`) while also registering a top-down Maps overview camera via `AddCamera` makes the overview show random scattered splats, because streaming only feeds the main camera's frustum/distance. **Fix:** when a second, differently-positioned camera must see the whole model, use full rendering (don't force streaming). See the gate in `WRLCCRenderer.ResolveCurrentConfig()` keyed off `LccRenderConfig.RenderOnMapPlayerCamera`.

## Common Task Patterns

### Add a new LCC load path

- Start at the caller that decides `MaterialType`.
- Ensure the LCC path resolves to a local or SDK-accepted absolute path.
- Instantiate the LCC prefab/object through the app's object factory.
- Keep SDK setup inside the LCC-specific renderer wrapper.

### Add a new runtime control

- First look for an SDK method in [references/lcc-sdk-api.md](references/lcc-sdk-api.md).
- If the SDK already exposes the control, wire it through the wrapper and then the app object.
- Keep UI code separate from SDK calls.

### Diagnose wrong orientation or scale

- Check whether the wrong transform is on the parent object or the render root.
- Check whether the project is applying both a parent rotation and an SDK correction rotation.
- Check whether negative scale is being interpreted as an unexpected Euler angle in the Inspector.
- Check whether bounds-driven default scale is overwriting a user-modified scale.

### Diagnose load failure

- Verify the resolved SDK path first.
- Verify whether the source is a packaged archive or an already-extracted `meta.lcc`.
- Verify the selected `PlatformType`.
- Verify whether the callback fires and whether `GetBounds()` or other follow-up API calls throw.

## Reference Use

- Read [references/lcc-sdk-api.md](references/lcc-sdk-api.md) when you need exact signatures or feature coverage such as:
  - `GetBounds`
  - `SetFOV`
  - `SwitchRenderMode`
  - `SetClip` / `SaveClip`
  - `Raycast` / `RaycastMesh`
  - `SetColliderEnable`
  - `AddCamera` / `RemoveCamera`
  - `SetRenderAll`, LOD, or mobile/streaming performance APIs

## Output Expectations

- Explain whether a behavior comes from app-side code or the SDK.
- When changing code, preserve the existing integration structure unless the user asks for a broader redesign.
- If a bug is caused by packaging, path resolution, or cache reuse, state that explicitly before modifying render logic.
