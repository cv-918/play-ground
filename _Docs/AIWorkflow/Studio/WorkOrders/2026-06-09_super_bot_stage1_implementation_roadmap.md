# WorkOrder: Super Bot Stage 1 Implementation Roadmap

Status: Reviewable roadmap / not execution approval for all batches
Date: 2026-06-09
Owner: Human Director
Primary worker: Stage 1 Super Bot
Related skill: `super-bot-stage1`
Related docs:

- `_Docs/AIWorkflow/Universal_AI_Staff_Behavior.md`
- `_Docs/AIWorkflow/SuperBot_Stage1_Operating_Charter.md`
- `_Docs/AIWorkflow/SuperBot_Stage1_Flowchart.html`

## 1. Goal

Turn the current Discord/Hermes bot into a reliable Stage 1 Super Bot through small, reviewable WorkOrder batches.

Stage 1 Super Bot means one end-spec AI employee that can work 1:1 with the user across planning, implementation, review, verification, documentation, and reporting without pretending to delegate to nonexistent subordinate staff.

## 2. Non-Goals

This roadmap does not approve:

- source code changes to the game project
- JSON schema changes
- save/load behavior changes
- build setting changes
- automatic commit/push/release/deploy
- creation of real subordinate staff bots
- Studio UI implementation
- broad automation beyond smoke tests and documentation

Each implementation batch still needs its own approved execution scope.

## 3. Current Baseline

Already completed:

- `super-bot-stage1` Hermes skill created.
- Discord channel `1499317420148658299` configured to auto-load `super-bot-stage1` for new sessions.
- Gateway restarted successfully after config change.
- `AGENTS.md` references the new Super Bot behavior documents.
- HTML flowchart artifact created at `_Docs/AIWorkflow/SuperBot_Stage1_Flowchart.html`.
- Minimal Discord runtime smoke test previously confirmed terminal, git, file/search, AGENTS.md access, and gateway health.

Known baseline caveats:

- Existing Discord sessions may not receive auto-loaded skill until `/reset`, new thread/session, or explicit `/skill super-bot-stage1`.
- Discord gateway default terminal cwd may be `/c/Users/kalux`; repo work must use explicit workdir `/c/Users/kalux/workStation/play-ground`.
- Active Hermes logs are under `C:/Users/kalux/AppData/Local/hermes/logs/`.
- `_Docs/VisualTests/` is an existing untracked repo item and is not part of this roadmap unless explicitly approved.

## 4. WorkOrder Batch Plan

### Batch 0 — Activation and Skill-Load Verification

Purpose:

Verify that new Discord sessions in the target channel actually load `super-bot-stage1` and that the bot can state the Stage 1 operating rules from the skill.

Scope:

- Start a new Discord session or use `/reset`.
- Ask the bot to summarize its Stage 1 Super Bot role and source-of-truth order.
- Confirm that it mentions direct execution, scope-based approval, uncertainty signaling, and repo-harness boundaries.
- Check gateway log for inbound/response success.

Non-goals:

- No file changes.
- No source code changes.
- No cron/job creation.

Acceptance criteria:

- Bot response reflects `super-bot-stage1` rules without manual re-pasting.
- Gateway log shows successful inbound/response after the reset/new session.
- Any limitation is recorded.

Validation:

- Discord response review.
- `hermes gateway status`.
- Recent gateway log check.

Output:

- ResultReview: `_Docs/AIWorkflow/Studio/ResultReviews/YYYY-MM-DD_super_bot_batch0_activation.md`

### Batch 1 — Intake and Clarification Routine

Purpose:

Stabilize how Super Bot turns user requests into goal, scope, non-goals, success criteria, ambiguity, and next action.

Scope:

- Create a lightweight intake template.
- Test with three prompts:
  1. clear read-only request
  2. ambiguous implementation request
  3. scope-expanding request
- Verify that the bot proceeds on clear low-risk requests and asks until ambiguity is removed for ambiguous implementation.

Non-goals:

- No game source edits.
- No role-specific staff design.

Acceptance criteria:

- Intake output consistently includes goal/scope/non-goals/success criteria.
- Ambiguous implementation prompts trigger specific clarification questions.
- Scope-expanding prompts trigger permission-boundary warning.

Validation:

- Prompt/response transcript review.
- Checklist against Universal AI Staff Behavior.

Output:

- Template candidate: `_Docs/AIWorkflow/Studio/Templates/SuperBot_Intake_Template.md` or existing template path if preferred.
- ResultReview for Batch 1.

### Batch 2 — Design / Plan Document Routine

Purpose:

Ensure meaningful implementation work creates a design/plan document before execution.

Scope:

- Define minimal plan document structure for Super Bot work.
- Run a safe documentation-only task as a rehearsal.
- Confirm the bot reviews its own plan before making changes.

Non-goals:

- No C++ source change.
- No schema/save/build/workflow policy change.

Acceptance criteria:

- Plan includes goal, background, approved scope, non-goals, affected areas, implementation steps, validation plan, risks, and stop/reapproval criteria.
- Plan review explicitly checks final-form architecture, simplicity, scope, permission boundary, and validation.

Validation:

- Read generated plan.
- Confirm no implementation begins before plan exists.

Output:

- Super Bot plan template or WorkOrder addendum.
- ResultReview for Batch 2.

### Batch 3 — Progress Record Routine

Purpose:

Ensure the bot records meaningful decisions, commands, changed files, blockers, and scope-change signals while working.

Scope:

- Define minimal progress record format.
- Test with a safe multi-step documentation task.
- Confirm progress record is updated after meaningful steps.

Non-goals:

- No long-running autonomous execution.
- No external worker dispatch.

Acceptance criteria:

- Progress record shows timeline, commands/tools, files touched, decisions, blockers, and validation attempts.
- If scope-change signal appears, the bot stops or asks rather than continuing silently.

Validation:

- Inspect RoleRun/progress record.

Output:

- Progress template candidate.
- ResultReview for Batch 3.

### Batch 4 — Completion Record and Gap Analysis Routine

Purpose:

Ensure completed work creates a completion record and compares actual outcome against the original design.

Scope:

- Define completion record structure.
- Test with a safe documentation change.
- Confirm design-vs-completion gap analysis and behavior improvement notes are included.

Non-goals:

- No automatic commit.
- No completion card / verification gate implementation unless separately approved.

Acceptance criteria:

- Completion record includes summary, changed files, validation, unrun validation, risks, human decisions, design-vs-completion gap, and improvement actions.
- Final response points to the completion record and states commit decision remains human-owned.

Validation:

- Inspect ResultReview/completion record.

Output:

- Completion template candidate.
- ResultReview for Batch 4.

### Batch 5 — End-to-End Safe Scenario Test

Purpose:

Run a complete Super Bot flow on a safe, bounded task from instruction to final report.

Scope:

- Use a documentation-only or read-only-plus-doc task.
- Require intake, plan, plan review, progress, execution, verification, self-review, completion, and final report.

Non-goals:

- No game source edits unless separately approved.
- No schema/save/build/workflow policy changes.

Acceptance criteria:

- Full flow executes without missing required artifacts.
- Bot stays inside scope.
- Verification is honest and evidence-backed.
- Final report is concise and decision-oriented.

Validation:

- Artifact checklist.
- Git diff review.
- Gateway/session behavior review if run through Discord.

Output:

- End-to-end scenario ResultReview.
- WorkLog or Retrospective if process issues appear.

### Batch 6 — Process Tuning and Rule Updates

Purpose:

Use Batch 0-5 results to tune the skill/docs/templates.

Scope:

- Identify friction:
  - too much questioning
  - too heavy documentation
  - weak validation wording
  - unclear scope checks
  - Discord response too long
- Patch `super-bot-stage1` skill and repo docs if needed.

Non-goals:

- No new subordinate staff roles.
- No Studio UI implementation.

Acceptance criteria:

- Issues from scenario tests are classified as Critical/Major/Minor/Optional.
- Required rule/template fixes are applied or deferred with rationale.
- The final Super Bot Stage 1 operating loop is usable for real project work.

Validation:

- Read updated docs/skill.
- Confirm no conflicts with `AGENTS.md`.

Output:

- Retrospective: `_DevLog/Retrospective/YYYY-MM-DD_super_bot_stage1_tuning.md`
- Updated skill/docs/templates if approved.

## 5. Recommended Execution Order

1. Batch 0 — Activation and Skill-Load Verification
2. Batch 1 — Intake and Clarification Routine
3. Batch 2 — Design / Plan Document Routine
4. Batch 3 — Progress Record Routine
5. Batch 4 — Completion Record and Gap Analysis Routine
6. Batch 5 — End-to-End Safe Scenario Test
7. Batch 6 — Process Tuning and Rule Updates

## 6. Human Approval Gates

Before each batch, the Human Director should approve:

- batch number
- exact scope
- allowed files or allowed artifact paths
- whether Discord or CLI is the execution channel
- whether file writes are allowed
- validation expectations

Renew approval if the batch needs to expand beyond its defined scope.

## 7. Immediate Next Recommendation

Start with Batch 0.

Suggested Discord prompt after `/reset` or in a new session:

```text
Super Bot Stage 1 activation check를 해줘.

목표:
- 이 새 Discord 세션에서 super-bot-stage1 skill이 자동 로드되었는지 행동 기준으로 확인한다.
- 파일 수정/생성/삭제, git 변경, cron 생성, 메시지 전송/삭제/관리 작업은 하지 않는다.

수행:
1. 너의 Stage 1 Super Bot 역할을 5줄 이내로 요약한다.
2. source-of-truth order를 요약한다.
3. scope-based approval, ambiguity 질문 정책, verification honesty, repo workdir 주의점을 언급한다.
4. 이 응답이 skill 기반인지, 아니면 일반 추론인지 불확실하면 불확실하다고 말한다.

보고 형식:
- activation 판단: PASS / UNCERTAIN / FAIL
- 근거
- 제한 사항
```

If this passes, proceed to Batch 1.
