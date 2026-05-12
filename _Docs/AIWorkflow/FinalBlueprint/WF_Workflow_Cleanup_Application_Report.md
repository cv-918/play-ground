# WF-408 Workflow Cleanup Application Report

## Summary

WF-408 applied the approved non-destructive workflow cleanup after the unified
PC Runner entrypoint was implemented.

The cleanup does not remove commands. It clarifies the command surface so the
regular workflow is centered on `/ai runner`, while older bridge commands remain
available as manual escalation, diagnostic, or compatibility surfaces.

## Applied Decisions

- `/ai runner` is documented as the regular PC Runner workflow surface.
- `/ai prepare codex` and `/ai prepare goal` remain registered as manual
  escalation commands.
- `/ai result audit` remains registered as a manual escalation audit command.
- `/ai run ...` commands are described as diagnostic/recovery helpers.
- `/ai intake-create` remains registered as a compatibility alias for
  `/ai intake`.
- Unsupported runner profiles are hidden from the Discord command choices.
  The local runner still rejects unsupported profiles safely.
- No command was removed.

## Discord Metadata Cleanup

Updated slash command descriptions to make the categories visible:

- regular PC Runner path
- manual escalation
- diagnostic/recovery
- compatibility alias

The runner `profile` choice list now exposes only `validation`, because that is
the currently executable runner profile. This avoids implying that
implementation, analysis, or documentation profiles are ready for normal
Discord use.

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
