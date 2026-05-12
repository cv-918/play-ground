# Discord Command Surface and Card Output Update

## Summary

Removed the obsolete `/ai intake-create` compatibility alias and converted the remaining plain-text Discord command replies to shared embed/card formatting.

## Scope

- Removed `/ai intake-create` from the registered `/ai` command definition.
- Kept `/ai intake` as the single Backlog task creation path.
- Added a generic text-to-card formatter for command replies that still used plain content strings.
- Updated user-facing workflow docs and command references to reflect the current command surface.

## Validation

- `node --check tools\discord-orchestrator\src\index.js`
- `node --check tools\discord-orchestrator\src\commands\ai.js`
- `node --check tools\discord-orchestrator\src\services\responseFormatter.js`
- `node --check tools\discord-orchestrator\src\services\koreanOutput.js`
- `npm --prefix tools\discord-orchestrator run register`
- `git diff --check`
- Local command schema check confirmed `/ai intake-create` is no longer registered.
- Local card formatter smoke confirmed section headings become embed fields.

## Notes

`git diff --check` reported only existing line-ending normalization warnings for touched files.
