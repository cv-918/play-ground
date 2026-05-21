# 2026-05-19 CharacterStation User Guide

## Summary

Added a Korean HTML user guide for CharacterStation that explains what the scene can do and how to use it from a user perspective.

## Background

The CharacterStation feature pass expanded the scene with character selection, data editing, animation clip management, preview guides, validation, save/reload safety, presets, and enemy projectile preview. The requested follow-up was a user-facing guide, not a code or developer architecture document.

## Scope

- Document CharacterStation capabilities.
- Explain how to enter the scene and read the screen.
- Explain the basic workflow for editing, previewing, validating, saving, reverting, and reloading.
- Explain animation clip setup, resource sequence assignment, and enemy projectile test preview.
- Keep the document user-oriented and avoid code-level implementation details.

## Files Changed

- `_Docs/Systems/Guide/CharacterStation_User_Guide_KR.html`
- `_DevLog/WorkLog/2026-05-19_CharacterStation_UserGuide.md`

## Review Summary

- Reviewed the guide for user-facing language and alignment with the implemented CharacterStation controls.
- No AIWorkflow user guide update is needed. This task adds a game-system usage guide and does not change AIWorkflow commands, approvals, runner routing, completion steps, or user intervention points.

## Validation Summary

- Manual document rendering in a browser was not performed in this pass.
- Source-level HTML structure was checked by inspection while writing.

## Remaining Risks

- The guide should be opened in a browser once to confirm visual layout and Korean text rendering.
- If CharacterStation UI labels change later, the guide should be updated in the same change set.

## Local Artifact Policy

No `_Temp`, `_Local`, `node_modules`, `.env`, or local config files were created or modified by this work.
