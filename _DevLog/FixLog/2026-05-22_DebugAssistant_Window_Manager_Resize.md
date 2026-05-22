# DebugAssistant Window Manager And Resize

## Summary
- Expanded the DebugAssistant system window into a lightweight window manager.
- Added per-window Show/Hide controls for registered runtime debug windows.
- Added manual height resizing for runtime debug windows while preserving content-driven width and scroll behavior.
- Added runtime z-order so clicked debug windows are brought to the front.

## Background
- Station scenes use several DebugAssistant windows at once.
- The previous always-auto-size policy made large editor windows cover too much of the screen.
- The old global `IsDrawingWindows` behavior kept only one arbitrary window alive when disabled, which made window management awkward.

## Scope
- Changed only runtime debug tooling UI behavior.
- Did not change gameplay data, JSON schemas, scene logic, or save/load behavior.

## Files Changed
- `PlayGround/Project/EngineSystems/Debug/RunTimeDebuggingAssistant.h`
- `PlayGround/Project/EngineSystems/Debug/RunTimeDebuggingAssistant.cpp`
- `PlayGround/Project/EngineSystems/Debug/RunTimeDebugWindow.h`
- `PlayGround/Project/EngineSystems/Debug/RunTimeDebugWindow.cpp`

## Implementation Notes
- The DebugAssistant manager window is always processed.
- `Debug Windows Master Visible` controls whether non-manager windows are processed globally.
- Each registered non-manager debug window gets a persistent visibility checkbox in the manager window.
- Hidden windows are skipped for `BeginFrame`, `Update`, and `Render`.
- Frame-only text is not collected for hidden windows, preventing frame element accumulation while a hidden window's scene keeps submitting debug text.
- Manual height resize uses a bottom-edge hit area and keeps width content-driven.
- After manual resize, content overflow continues to use the existing scroll behavior.
- `RunTimeDebuggingAssistant` now keeps a runtime z-order list; new windows are added to the front, removed windows are removed from the list, and rendering follows z-order.
- On mouse down, the topmost processable window under the cursor becomes the input window and is moved to the front.
- `RunTimeDebugWindow::Update` now separates layout refresh from mouse/control input so overlapped lower windows do not react to the same click.

## Review Summary
- Checked that checkbox elements are not recreated every frame, so press/release state can survive across frames.
- Checked that removed windows also remove their manager checkbox.
- Checked that manager window processing does not depend on the global visibility toggle.
- Checked that hidden windows and Master Visible off windows are excluded from z-order hit testing.
- Checked that the active input window is cleared when a window is hidden, removed, or hidden by the master toggle.

## Validation Summary
- `git diff --check -- PlayGround/Project/EngineSystems/Debug/...` passed with line-ending warnings only.
- `msbuild` from PATH was unavailable, so the Visual Studio 2022 Community MSBuild path was used.
- Full `PlayGround.sln Debug|x64` build compiled but failed at link because `PlayGround/_Bin/Debug/x64/PlayGround.exe` was locked by a running `PlayGround` process.
- After the z-order change, `PlayGround.vcxproj /t:ClCompile Debug|x64` completed with 16 existing conversion warnings and 0 errors.
- After the z-order change, full `PlayGround.sln Debug|x64` build failed only at link with `LNK1104` because a running `PlayGround` process still held the output exe.
- Later, `PlayGround.vcxproj /t:Build Debug|x64` completed with 0 warnings and 0 errors after the output executable was no longer locked.
- Runtime UI validation was not performed in this session.

## Remaining Risks
- Manual runtime checks are still needed for manager checkbox interaction, hidden-window restoration, resize drag, z-order fronting, overlapped control input blocking, and scroll behavior in Station scenes.

## Guide Update Decision
- `_Docs/AIWorkflow/Guide/AIWorkflow_User_Guide_KR.html` does not need an update because this change is game debug tooling UI, not an AIWorkflow behavior or command change.
