# WF-413 Intake Auto-Handoff

## Summary

Formalized the first low-risk `/ai intake` to PC Runner auto-handoff path.

The feature allows eligible P2/P3 low-risk documentation or validation intake
tasks to continue through ActiveTask selection, deterministic approval note, and
PC Runner start without separate manual `set-active`, `approve`, and
`runner start` commands.

## Background

The WF-201 through WF-412 runtime layers provided the required execution,
evidence, verification, completion, finalization, and follow-up primitives.
The remaining friction was that Human Director still had to type multiple
commands after intake for low-risk work.

## Scope

Changed:

- Discord orchestrator config shape for `intake_auto_handoff`
- intake task creation service
- new intake auto-handoff policy/service
- intake response formatting
- PC Runner response next-command formatting
- explicit intake category marker handling for rule-based cross-check
- Discord orchestrator config example
- Human Director and command quick-reference docs
- AIWorkflow document map

Not changed:

- P0/P1 or medium/high-risk approval policy
- GAME/WF/UNITY automatic approval
- task done automation
- finalization automation
- commit/push automation
- release/deploy behavior

## Implementation Notes

Eligibility is deterministic:

- P2/P3 only
- low risk only
- DOC/VAL or documentation/validation only
- no clarifying questions
- no rule-based cross-check review requirement
- supported PC Runner profile/executor only

Current runner mapping:

- DOC/documentation -> implementation/codex_cli
- VAL/validation -> validation/local_cli

The rule-based intake baseline now treats leading category markers such as
`VAL task:`, `DOC task:`, and `WF task:` as stronger than ordinary keyword
matches. This keeps validation smoke requests from being misclassified as
documentation tasks merely because the request says no document files should be
changed.

## Review Summary

The change keeps risky categories behind Human Director approval. It does not
make completion, finalization, done, commit, push, release, or deploy automatic.

## Validation Summary

Planned validation:

- Node syntax checks for changed JS files
- explicit `VAL task:` rule-based classification smoke
- deterministic policy smoke
- PC Runner formatter next-command smoke
- `git diff --check`

Live Discord UI smoke is still recommended because it requires the running
Discord bot interaction surface.

## Remaining Risks

- DOC auto-handoff uses the implementation/codex_cli runner profile, so local
  Codex CLI readiness and prompt boundaries still matter.
- The first policy is intentionally narrow. Low-risk WF maintenance expansion
  should remain a separate approved task.
- Completion review still stops at the Human Director gate.

## Next Tasks

- WF-414 live Discord intake auto-handoff smoke
- WF-415 model/reasoning routing
- WF-420 completion review UX shortening
- WF-421 additional runner response polishing
