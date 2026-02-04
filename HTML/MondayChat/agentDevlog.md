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

## Notes / Known Issues
- Browser cache: HTML/JS/CSS should be no-store; use hard refresh if changes don’t show.
- Some VRM rigs differ; arm axis (x/y/z) may need per-model tuning.
- Model version: VRM 1.0 (user confirmed).
- **Fix**: Switched arm control axis from Y to Z to allow lowering arms from T-pose.
- **Known Issue**: T-pose may persist if initial rotation values are not applied after VRM load or are overwritten by default 0 values in the update loop.
