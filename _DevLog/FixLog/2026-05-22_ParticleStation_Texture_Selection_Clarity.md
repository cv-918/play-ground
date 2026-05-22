# ParticleStation Texture Selection Clarity

## Summary
- Renamed ParticleStation editor labels to make preset selection and texture selection distinct.
- Added an on-screen preview panel for the currently selected particle texture.

## Background
- `Particle Source` was easy to confuse with the actual texture resource selector.
- The source combo selects `Particle.json` presets, while the texture combo selects PNG/BMP/JPG resources.

## Scope
- UI label clarification in `ParticleStationScene`.
- Read-only preview rendering for the selected event texture.
- No particle data schema or JSON content changes.

## Files Changed
- `PlayGround/Project/Gameplay/Scenes/ParticleStationScene.h`
- `PlayGround/Project/Gameplay/Scenes/ParticleStationScene.cpp`

## Implementation Notes
- `Particle Source` label is now `Particle Preset`.
- `Texture` label is now `Particle Texture`.
- The selected event's `textureKey` is drawn in a right-side preview panel.
- Empty or unloadable textures show a fallback message instead of failing silently.

## Validation Summary
- `msbuild PlayGround/PlayGround.sln /p:Configuration=Debug /p:Platform=x64 /m` succeeded with 0 warnings and 0 errors.
- Runtime visual validation was not performed by the assistant.

## Remaining Risks
- The preview panel uses a fixed right-side screen area and may need layout tuning if future ParticleStation UI grows into that space.
