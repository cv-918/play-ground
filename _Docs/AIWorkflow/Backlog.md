# AI Workflow Backlog

## Purpose

This is the durable TODO list for Dust Land and AI workflow automation.

`Backlog.md` tracks candidate work.

`TaskRequests/` stores execution prompts and task-specific records.

---

## Strategic Direction

The workflow is not Dust Land custom-engine only.

Long-term target:

```text
Unity-based solo game development and release workflow.
```

Target platforms:

```text
Steam
Google Play / mobile stores
```

Dust Land is currently a custom C++/WinAPI prototype and workflow testbed.

Future workflow design must support Unity project profiles and multi-project reuse.

---

## Status Values

```text
todo
analysis
awaiting_approval
ready_for_implementation
in_progress
review
validation
blocked
done
deferred
```

## Kind Values

```text
workflow
architecture
implementation
refactoring
validation
data
documentation
automation
unity
release
```

---

## Backlog Items

| ID | Priority | Status | Kind | Item | Reason | Tool Route | Validation |
|---|---:|---|---|---|---|---|---|
| WF-001 | P0 | done | workflow | Seed `ProjectStatus.md`, `Backlog.md`, `ActiveTask.md` | Durable state layer required for Level 2/Discord future | ChatGPT | Document review |
| WF-002 | P0 | done | workflow | Define fixed task status enum and lifecycle transitions | Discord bot should not parse free-form workflow state | ChatGPT | Document review |
| WF-003 | P1 | done | automation | Add local full-diff capture script | New-file diff omission was a real issue | ChatGPT -> manual | `capture_diff.bat --include-untracked` passed |
| WF-004 | P1 | done | automation | Add JSON smoke-check routine | Critical JSON parse risk must be detected quickly | ChatGPT -> manual | JSON smoke check passed: total 11, failed 0 |
| WF-005 | P1 | done | automation | Define read-only status summary command for future Discord use | Discord v1 needs safe status collection | ChatGPT -> manual | status output review |
| WF-006 | P2 | done | architecture | Design Discord Orchestrator architecture v1 into actionable implementation stages | Long-term goal needs Discord-connected workflow | ChatGPT | Architecture review |
| WF-007 | P2 | todo | automation | Design local Orchestrator Core state machine | Required before Discord writes/routes tasks | ChatGPT | State transition review |
| WF-008 | P3 | deferred | automation | Implement Discord bot adapter | Wait until state files/local scripts stabilize | Future | Integration test |
| WF-009 | P1 | done | workflow | Define project profile schema for multi-project workflow | Future games are Unity-based; workflow must not overfit to Dust Land C++ prototype | ChatGPT | Schema review |
| WF-010 | P1 | done | automation | Implement read-only task status summarizer | Discord v1 needs machine-readable summaries from ActiveTask/Backlog/ProjectStatus | ChatGPT -> manual | status output review |
| WF-011 | P1 | done | automation | Create project profile status reader | Future Discord and local orchestration need to read active project profile safely | ChatGPT -> manual | profile parse and summary output |
| WF-012 | P1 | done | automation | Define active project selector/config convention | Multi-project workflow needs a stable active project selection mechanism | ChatGPT -> manual | active project read test |
| WF-013 | P1 | done | automation | Design Discord Read-Only Bot v1 implementation plan | Discord v1 should expose read-only workflow/project status without write operations | ChatGPT | architecture review |
| WF-014 | P2 | done | automation | Implement Discord Read-Only Bot v1 | First Discord integration stage after command/spec approval | manual/Copilot bounded later | local bot command test |
| WF-015 | P2 | done | documentation | Document Discord Bot v1 validation result | Discord integration needs evidence before expanding permissions | ChatGPT | validation evidence review |
| WF-016 | P1 | done | automation | Implement active project status reader | Local scripts and Discord should read ActiveProject.json instead of relying only on local config defaults | ChatGPT -> manual | active project read test |
| WF-017 | P2 | done | automation | Integrate Discord project profile default with ActiveProject.json explicitly | Discord command behavior should make active project resolution obvious to users | ChatGPT -> manual | Discord project profile default test |
| WF-018 | P2 | done | documentation | Document Discord Bot v1 operation guide for daily use | Discord read-only bot needs stable daily operation guidance before further automation | ChatGPT | guide review |
| WF-019 | P2 | todo | automation | Design Discord approval-note workflow | Next Discord stage should record human approvals without executing implementation work | ChatGPT | architecture review |
| WF-020 | P1 | done | automation | Add Discord Bot always-on operation scripts | Discord bot must support local start/stop/status/restart and background operation | Codex App -> manual validation | always-on operation validation passed |
| WF-021 | P2 | done | maintenance | Harden Discord bot Node warnings and commandRunner shell usage | Bot logs show deprecation/security warnings that should be cleaned up after always-on operation is stable | Codex App -> manual validation | done: "Verification passed after Release D commandRunner hardening: npm run register passed, restart_bot.bat passed, status_bot.bat showed running, Discord /ai status, /ai run workflow-status, and /ai run json-smoke worked, stderr log showed no deprecated ephemeral warning and no DEP0190 shell warning." |
| WF-022 | P1 | done | automation | Implement Discord task management commands | Discord should support task current/list/create/set-active for workflow management | Codex App -> manual validation | Discord task command validation passed |
| WF-023 | P1 | done | automation | Implement Discord approval and status note commands | Discord should support approve/block/defer/done task status transitions after task management is stable | Codex App -> manual validation | Discord task status command validation passed |
| WF-024 | P1 | done | automation | Implement Discord safe script execution commands | Discord should be able to run allowlisted workflow validation scripts after status command writes are stable | Codex App -> manual validation | Discord safe script execution validation passed |
| WF-025 | P1 | done | automation | Implement Codex App task routing prompt generation | Discord workflow should generate execution-engine prompts after safe validation commands are stable | Codex App -> manual validation | Codex prompt generation validation passed |
| UNITY-001 | P1 | todo | unity | Define Unity project workflow profile requirements | Needed for Steam/Play Store Unity projects | ChatGPT | Document review |
| UNITY-002 | P2 | todo | unity | Define Unity validation profile candidates | Unity workflows need build/playmode/editmode/package validation categories | ChatGPT -> Codex later | Validation profile review |
| UNITY-003 | P2 | todo | release | Define release-track workflow fields for Steam and Google Play | Long-term workflow includes publishing, not just coding | ChatGPT | Release checklist review |
| GAME-001 | P0 | partial_done | data | Verify/fix `Skill.json`, `PlayableCharacter.json`, `AttributeNode.json` integrity | Syntax smoke check passed; runtime loader validation remains | Codex -> manual/Copilot | GameDataLoader, boot, OutGame entry |
| GAME-001B | P0 | done | validation | Runtime validate GameDataLoader after JSON syntax smoke check | First real game-development task to validate the Discord workflow MVP in practical use | Codex App -> manual validation | done: "Debug x64 runtime validation passed: json smoke Failed 0, Debug x64 build passed, Data copied to output directory, game booted, Intro to OutGame transition passed, no GameDataLoader/OutGame debug errors observed, player/MainView/NPC displayed normally." |
| GAME-002 | P1 | done | architecture | Consolidate run clear semantics | Survival/kill clear/next stage are split | ChatGPT -> Codex -> Copilot | done: "Runtime validation passed: timer expired result, player death result, kill goal reached, stage progress action, result restart, and pause abandon were verified. Rewards and stage progress are applied only on confirming actions such as RESTART, EXIT, or explicit stage progress action. Kill goal reached alone does not increase stage_progress." |
| GAME-003 | P2 | deferred | refactoring | Replace town `npcs_[index]` dependency with `npc_id` role lookup | Reduces coupling but low ROI now | Codex -> Copilot | Placement reorder, enabled=false, story interaction |
| GAME-004 | P2 | done | refactoring | Consume dialogue session result explicitly | `end_reason` and `choice_records` TODO remains | Codex -> Copilot | done: "Runtime validation passed: OutGame entry normal, normal dialogue completion preserved story/event flow, hold skip worked, required gameplay events executed during skip, no abnormal termination or duplicate handling observed, NPC Prologue4 callback dialogue start/end worked, result consumption preserved flow, scene exit/return did not treat running dialogue as normal completed." |
| GAME-005 | P2 | done | refactoring | Replace `GetDataByIndex(0)` with deterministic character selection | `unordered_map` index access may be non-deterministic | Codex -> Copilot | done: "Reduced-scope deterministic playable character lookup implemented and committed. GetDataByIndex(0) playable character selection was replaced with explicit default Dusty ID lookup. Debug x64 build passed, json smoke passed, and no remaining GetDataByIndex(0) usage exists in PlayGround/Project." |
| GAME-006 | P2 | todo | data | Normalize `UserData.json` and guard level-0 node data | Current save data may contain invalid node level | Codex -> Copilot | Load/save roundtrip, node state |
| GAME-007 | P3 | todo | refactoring | Standardize data loader path and failure policy | Loader policy differs between managers | ChatGPT -> Codex -> manual | cwd boot, reload, optional/fatal separation |
| GAME-008 | P3 | todo | analysis | Audit unused schema fields | `facing`, `spawn_interval_`, `unlock_type_`, `grade_` unclear | ChatGPT -> Codex | Field usage table |
| VAL-001 | P1 | todo | validation | Combat/reward/collection/restart playtest pass | Runtime exists but current evidence is partial | Human validation | Contact, projectile, dust, result values |
| DOC-001 | P1 | todo | documentation | Consolidate workflow instruction entry points | Multiple instruction files may drift | ChatGPT | Document review |
| VAL-20260504-205258 | P2 | done | validation | VAL-002 Add run result semantics smoke validation | Automate part of the GAME-002 runtime validation for TimeExpired, PlayerDied, StageProgressed, Abandoned, reward/save timing, stage_progress rules, and duplicate result application. | Discord -> human review | done: "Analysis-only validation planning completed. Codex confirmed that reduced-scope smoke validation should be split into a follow-up task. Recommended path is a focused dev-only or pure-helper smoke validation for TimeExpired, PlayerDied, StageProgressed, Abandoned, duplicate apply guard, reward/save timing, and stage_progress rules." |
| VAL-20260504-214915 | P2 | done | validation | VAL-003 Implement reduced-scope run result semantics smoke validation category: VAL | Add focused smoke validation for GAME-002 run result semantics without mutating save data or introducing a broad test framework. | Discord -> human review | done: run_result_semantics_check.bat passed: TimeExpired, PlayerDied, StageProgressed, Abandoned, duplicate apply guard, result_apply_eligible behavior, stage_progress condition, reward/save eligibility rule. json_smoke_check passed: 11 OK, 0 failed. No UserData.json mutation. |
| WF-20260505-225727 | P1 | done | automation | WF-026 Add goal-oriented execution routing | Add Codex CLI /goal prompt generation as the next execution routing layer for the AIWorkflow orchestrator. | Discord -> human review | done: "WF-026 validation passed: /ai prepare goal default, GAME-001 analysis, GAME-005 implementation, WF-021 review generated goal request files under _Temp/AIWorkflowTaskRequests. /ai status and /ai active passed. npm run register passed, bot restart/status passed, git diff --check passed with line-ending warnings only, and private/local files were not tracked." |
| WF-20260505-233013 | P1 | done | documentation | WF-028 AI Tool Radar and Integration Matrix | Evaluate OpenClaw, Claude-Code-Game-Studios, Codex goal, Codex subagents, Unity AI, and Codex Computer Use as candidate tools for the AI orchestration agent-driven game development workflow. | Discord -> human review | done: "Analysis completed. AI Tool Radar and Integration Matrix recommends Codex Subagents read-only pilot as the next step, followed by Claude-Code-Game-Studios role mapping, Codex Goal Prompt Contract v2, OpenClaw threat model, and Unity AI/MCP future adapter profile. No source files were modified by the analysis." |
| WF-20260505-234617 | P0 | done | validation | WF-030 Codex Subagents Read-Only Pilot | Validate whether Codex Subagents can support the AI orchestration agent-driven workflow as read-only Explorer, Reviewer, and Validator roles before allowing any write-capable subagent workflow. | Discord -> human review | done: "Read-only Codex Subagents pilot passed. Explorer, Reviewer, and Validator subagents completed successfully. Findings were complementary: Explorer mapped GAME-001 data flow, Reviewer found semantic/runtime risks, Validator separated syntax checks from semantic/runtime validation gaps. Final judgment: Subagents are useful enough to become part of AIWorkflow as optional risk-based read-only analysis pattern. Repo source/data/docs were not modified by the pilot." |
| WF-20260506-000345 | P1 | done | automation | WF-031 Codex Goal Prompt Contract v2 | Standardize the goal_request markdown contract generated by /ai prepare goal so Codex /goal executions have stable objective, scope, non-goals, safety constraints, human decision gates, validation plan, stop conditions, completion audit, and return format. | Discord -> human review | done: "WF-031 validation passed: Codex Goal Prompt Contract v2 implemented. /ai prepare goal generated Contract v2 goal request files for GAME-001 analysis, GAME-005 implementation, and WF-021 review. Generated files start with /goal and include Objective, Task Context, Project Context, Scope, Non-goals, Execution Mode, Safety Constraints, Human Decision Gates, Subagent Policy, Validation Plan, Stop Conditions, Completion Audit, and Required Return Format. npm register, bot restart/status, git diff --check, and private-file checks passed." |
| WF-20260506-013135 | P1 | done | documentation | WF-029 Claude-Code-Game-Studios Role Mapping | Analyze Claude-Code-Game-Studios as a read-only reference for game-development AI agent roles, skills, and workflow structure. Extract only reusable concepts for our AIWorkflow orchestrator. Do not install Claude Code or migrate our workflow. | Discord -> human review | done: Read-only analysis completed. Claude-Code-Game-Studios should be adapted, not adopted. Useful concepts include role hierarchy, phase gates, story-readiness to implementation to review loop, agent delegation map, and verdict patterns. Recommended next step is WF-032 Agent Role Registry v1. No files were modified by Codex. |

---

## Recommended Next Workflow Task

```text
WF-002: Define fixed task status enum and lifecycle transition rules
```

Reason:

```text
This is the next direct step toward Level 3 and future Discord orchestration.
```

---

## Recommended Next Gameplay Task

```text
GAME-001: Runtime validate GameDataLoader after JSON syntax smoke check
```

Reason:

```text
JSON syntax passed, but runtime loading and game boot are still separate.
```

Recommended path:

```text
Full Path:
ChatGPT orchestrator
-> Codex focused read-only analysis if needed
-> approval
-> runtime validation plan
-> user executes boot/OutGame check
-> update ProjectStatus
```

---

## Automation Track

Recommended workflow automation progression:

```text
WF-001 done
-> WF-003 done
-> WF-004 done
-> WF-002
-> WF-005
-> WF-009
-> WF-006
-> WF-007
-> WF-008
```

Current target:

```text
Level 3 stabilization
```

Discord bot integration should wait until read-only status collection, task state transitions, and project profile abstraction are stable.
