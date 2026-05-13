# WF-408 Workflow Cleanup Application Report

## Summary

WF-408 applied the approved non-destructive workflow cleanup after the unified
PC Runner entrypoint was implemented.

Status note: this report is historical. WF-429 and later work superseded part
of its command-surface state by removing the `/ai intake-create` compatibility
alias, exposing additional runner profiles, and adding newer completion/git
shortcuts. Use `WF_Post_309_Workflow_Stabilization_Roadmap.md` and the Human
Director guide for the current operating flow.

At the time, the cleanup did not remove commands. It clarified the command
surface so the regular workflow was centered on `/ai runner`, while older
bridge commands remained available as manual escalation, diagnostic, or
compatibility surfaces.

## Applied Decisions

- `/ai runner` is documented as the regular PC Runner workflow surface.
- `/ai prepare codex` and `/ai prepare goal` remain registered as manual
  escalation commands.
- `/ai result audit` remains registered as a manual escalation audit command.
- `/ai run ...` commands are described as diagnostic/recovery helpers.
- Superseded later: `/ai intake-create` is no longer registered. Use
  `/ai intake`.
- Superseded later: supported runner profiles now include
  `validation`, `build`, `implementation`, and `documentation`.
- Superseded later: obsolete command removal was applied in WF-429.

## Discord Metadata Cleanup

Updated slash command descriptions to make the categories visible:

- regular PC Runner path
- manual escalation
- diagnostic/recovery
- compatibility alias

Superseded later: the runner `profile` choice list now exposes supported
regular profiles such as `validation`, `build`, `implementation`, and
`documentation`.

## Documentation Cleanup

Updated:

- Discord bot README
- Operational Playbook
- command surface consolidation plan
- Korean command surface companion
- end-to-end technical spec
- Korean end-to-end technical spec companion
- Korean Human Director operation guide

## Safety Boundaries

WF-408 did not:

- remove slash commands
- rename slash commands
- change task lifecycle authority
- approve tasks
- mark tasks done
- create Backlog tasks
- automate commits or pushes
- run arbitrary shell commands
- modify game source or data

## Next Handoff

The workflow is now clearer for normal use:

```text
intake -> set-active -> approve if needed -> runner plan/start
-> completion review -> finalization -> runner continue
-> task done decision -> commit/push decision
```

The next practical automation work should focus on connecting a real
implementation runner profile to a controlled executor, while preserving the
same Human Director gates.
