# Dust Currency Icon Resources

## Summary
- Added two Dustland dust currency icon resources for Attribute Node UI usage.
- The resources are eye-less currency/material icons, not character or mascot sprites.

## Background
- The Attribute Node UI needs a readable dust currency symbol.
- A previous generated concept read too much like a Dusty-like character because it included eyes.
- This pass intentionally removes face elements and focuses on a dust clump plus value accents.

## Scope
- Added PNG resources only.
- No JSON, runtime code, renderer, UI layout, or Attribute Node data changes were made.

## Files Changed
- `PlayGround/Data/Resources/Textures/UI/Icons/Currency/Dust_Currency_64.png`
- `PlayGround/Data/Resources/Textures/UI/Icons/Currency/Dust_Currency_48.png`
- `_DevLog/WorkLog/2026-05-23_Dust_Currency_Icon_Resources.md`

## Implementation Notes
- Created the icons with local procedural drawing to avoid accidental face or character features.
- Both icons use a transparent background, dark dust silhouette, thick outline, small dust motes, and warm gold highlights.
- The 64px icon matches the existing skill icon asset scale.
- The 48px icon is provided as a direct-use smaller UI variant rather than relying only on runtime scaling.

## Validation Summary
- Verified both files exist.
- Verified sizes:
  - `Dust_Currency_64.png`: 64x64
  - `Dust_Currency_48.png`: 48x48
- Verified both reload as `Format32bppArgb`.
- Verified both have nonzero alpha and max edge alpha `0`.
- Created a temporary contact sheet for visual review on dark and light backgrounds.

## Build / Runtime Validation
- Build was not run because this task only adds standalone image resources.
- Runtime UI validation was not run because the icons are not wired into the Attribute Node UI in this task.

## Remaining Risks
- Final perceived size should be checked after the icons are connected to the actual Attribute Node currency display.
- If the UI renders at a very small size below 24px, a simplified 32px variant may be useful later.

## AI Assistance
- Codex generated the procedural icon resources and validation summary.
