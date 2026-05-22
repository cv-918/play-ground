# Custom Cursor Resource

## Summary
- Replaced the in-game client-area mouse cursor with `Data/Resources/Textures/UI/Cursor/cursor.png`.
- The PNG is decoded through WIC and converted into an OS `HCURSOR` so the Windows cursor position and click behavior remain native.

## Background
- The application previously registered the window class with `IDC_ARROW`.
- The requested cursor resource is a PNG, not a `.cur` file, so it needs runtime conversion before it can be passed to `SetCursor`.

## Scope
- Changed only the app entry/window message layer.
- Did not change renderer behavior, input logic, scene logic, or resource JSON data.

## Files Changed
- `PlayGround/Project/App/EntryPoint.cpp`

## Implementation Notes
- The window class still starts with the default arrow cursor because it is registered before the renderer initializes COM/WIC.
- After `pg.Initialize()` succeeds, `cursor.png` is loaded from the executable-relative `Data` folder and converted to `HCURSOR`.
- The original `256x256` PNG is resized to a `48x48` cursor image before cursor creation.
- The generated cursor includes an alpha-derived mask and uses the first visible pixel as the hotspot.
- The runtime also updates the window class cursor with `SetClassLongPtr` so later `WM_SETCURSOR` messages use the custom cursor path consistently.
- `WM_SETCURSOR` applies the custom cursor only for the client area, leaving non-client OS areas such as the title bar to Windows defaults.

## Validation Summary
- `MSBuild PlayGround/PlayGround.vcxproj /p:Configuration=Debug /p:Platform=x64 /t:ClCompile` passed after the cursor visibility fix.
- `MSBuild PlayGround/PlayGround.vcxproj /p:Configuration=Debug /p:Platform=x64 /t:Build` passed after the cursor visibility fix.
- Runtime visual confirmation was not performed in this log.

## Remaining Risks
- If the first visible pixel is not the intended pointer tip, the hotspot may need manual tuning.
- If the PNG fails to load, the app falls back to the Windows default arrow cursor.
