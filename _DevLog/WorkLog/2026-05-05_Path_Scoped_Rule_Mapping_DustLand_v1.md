# 2026-05-05 Path-Scoped Rule Mapping for Dust Land v1

## Summary

Implemented WF-035 by creating Path-Scoped Rule Mapping for Dust Land v1 inside
AIWorkflow.

The new document maps major repository paths to owner roles, main risks,
required review roles, required validation, and human decision gates. It is a
documentation-only policy document and does not introduce executable hooks,
automation, Discord command behavior, source changes, automatic approval, or
automatic commit/release behavior.

## Background

WF-032 created `Agent_Role_Registry_v1.md`, defining the durable AIWorkflow role
set.

WF-033 created `Role_Router_Rules_v1.md`, defining policy-only routing from
task metadata to role activation.

WF-034 created `Review_Validation_Verdict_Format_v1.md`, defining consistent
review, validation, documentation, and tooling verdict formats.

WF-035 adds the next layer: path-scoped rule selection for the Dust Land
repository so reviews, validations, and human gates can be chosen by changed
path.

## Scope

In scope:

- Create `_Docs/AIWorkflow/Path_Scoped_Rule_Mapping_DustLand_v1.md`.
- Link the new document from `_Docs/AIWorkflow/README.md`.
- Record this WorkLog.

Out of scope:

- Game source files.
- Discord command implementation.
- `_Local/`.
- `node_modules/`.
- `_Temp/`.
- Release or deploy scripts.
- `Backlog.md`.
- `ActiveTask.md`.
- Executable hooks or enforcement.
- Automatic validation, approval, commit, push, release, or deploy behavior.

## Files Changed

```text
_Docs/AIWorkflow/Path_Scoped_Rule_Mapping_DustLand_v1.md
_Docs/AIWorkflow/README.md
_DevLog/WorkLog/2026-05-05_Path_Scoped_Rule_Mapping_DustLand_v1.md
```

## Architecture Notes

The mapping is a policy and documentation layer only.

It connects path scopes to the role registry, role router, and verdict format:

- `PlayGround/Project/Gameplay/**` maps to gameplay implementation, source
  review, build validation, and manual runtime validation.
- `PlayGround/Project/EngineSystems/**`, `Core/**`, and `Framework/**` map to
  Technical Architect-led lifecycle, ownership, rendering, and framework
  contract review.
- `PlayGround/Data/**` maps to schema, JSON smoke, loader, and invalid-data
  behavior validation.
- `PlayGround/Data/Resources/**` maps to resource path, asset provenance, and
  visible runtime validation.
- `tools/aiworkflow/**` and `tools/discord-orchestrator/**` map to
  Tool/Workflow Engineer review and command-specific validation.
- `_Docs/AIWorkflow/**`, `_DevLog/**`, `.github/**`, and root workflow/config
  files map to documentation, policy consistency, document map, and private
  file tracking checks.

The Human Director remains the final decision-maker for approval gates,
validation acceptance, and commit decisions.

## Implementation Notes

The new document defines:

- Purpose.
- Global rules.
- Path rule summary table.
- Gameplay code rules.
- Engine/Core/Framework rules.
- Data rules.
- Resource rules.
- AIWorkflow tool rules.
- Discord Orchestrator rules.
- Documentation rules.
- Root/configuration rules.
- Human decision gates.
- Validation matrix.
- Non-goals.
- Next tasks.

The validation matrix covers:

- `git status --short`
- `git diff --check`
- `git diff --stat`
- `tools/aiworkflow/json_smoke_check.bat`
- Debug x64 build
- Bot register/restart/status
- Manual runtime validation
- Document map check
- Private file tracking check

## Review Summary

Review should check:

- `Path_Scoped_Rule_Mapping_DustLand_v1.md` exists.
- Major repository paths are covered.
- Each path has a primary owner role.
- Each path has a main risk.
- Each path has required review roles.
- Each path has required validation.
- Each path has explicit human gate triggers.
- Validation matrix exists and covers the requested checks.
- Non-goals prevent executable hooks, automation, Discord command behavior
  changes, source changes, and automatic approval/commit/release behavior.
- README links the new document.
- No game source files were modified.

## Validation Summary

Completed validation:

```text
git status --short
  passed: showed the intended README update and the intended new path-scoped
  mapping document and WorkLog. The two new files were marked intent-to-add so
  their contents are visible to git diff without committing. It also showed
  pre-existing modifications to _Docs/AIWorkflow/ActiveTask.md and
  _Docs/AIWorkflow/Backlog.md from before this Codex run.

git diff --check
  passed: no whitespace errors reported.
  note: Git reported LF-to-CRLF working-copy warnings.

git diff --stat
  passed: showed the new path-scoped mapping document, README update, WorkLog,
  and the pre-existing ActiveTask.md/Backlog.md modifications.

Verify no PlayGround source files were modified
  passed: git diff --name-only -- PlayGround/Project returned no files.

Verify README links Path_Scoped_Rule_Mapping_DustLand_v1.md
  passed: README contains the Path_Scoped_Rule_Mapping_DustLand_v1.md document
  map entry.

Private file tracking check
  passed: path-aware git ls-files check returned no _Local, node_modules,
  _Temp, .env, or discord_bot.local.json tracked files.
```

No build, runtime, JSON smoke, or bot validation was performed because this is
a documentation-only task and did not modify game source, data, build settings,
Discord implementation, workflow tool behavior, or runtime behavior.

## Remaining Risks

The mapping is policy-only. It has not been implemented as executable hooks,
CI enforcement, a Discord command, a role router, or an automated validator.

Future executable mapping or command integration must be handled by a separate
approved task with bounded scope, validation criteria, and human decision gates.

## Next Tasks

Recommended follow-up tasks:

1. Add path-scope hints to future ActiveTask metadata templates if approved.
2. Create a read-only document map check only if manual checks become
   error-prone.
3. Create a Small Role Router Prototype as a separate approved task.
4. Create a Discord role recommendation command as a separate approved task.

## AI Assistance

Codex created the path-scoped rule mapping document and this WorkLog under the
human-provided WF-035 `/goal` instructions. No commit was performed.
