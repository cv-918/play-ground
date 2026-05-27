# Handoff v2 Scope-Based Execution Principle

## Purpose

This document records the intended v2 operating standard for implementation approval in the AI Role Handoff System.

The standard is:

```text
Approval is triggered by scope departure, not by source code modification itself.
```

## Core Rule

When the human developer has approved a planning direction and an execution scope through a Handoff Packet, DeveloperPlan, work order, or equivalent task contract, the receiving role may implement normal source code changes and non-schema data changes needed to complete that approved scope.

The role should not ask for approval again only because implementation requires source code edits.

Source code edits are a normal part of Developer work. Ordinary data edits are also normal when the approved scope includes them and they do not change schema, save/load behavior, or persistent data semantics.

## What Approval Means

An approved execution scope should answer:

- what game, workflow, data, or repository behavior is intended
- which role is expected to execute it
- which files, systems, or areas are expected to be touched
- which files, systems, or areas are outside scope
- how the result should be validated

Once that scope is approved, the Developer works inside it.

## When To Stop Again

The role must stop and request renewed approval only when the work needs to leave the approved boundary.

Examples:

- the implementation needs files, systems, or behavior outside the approved scope
- the implementation changes JSON schema, save/load behavior, migration behavior, or persistent data semantics not already approved
- the implementation requires a structural refactor not included in the approved plan
- the implementation affects shared architecture or lifecycle rules beyond the approved target
- the design goal becomes ambiguous or materially different from the approved plan
- build settings, commit, push, release, deployment, or workflow rules need to change

## Supervisor Interpretation

Supervisor and future role-worker automation should not treat `source code changed` as an automatic approval violation.

They should check whether the source code change is inside an approved execution scope.

The useful violation is:

```text
implementation appears outside approved scope
```

not:

```text
implementation edited source code
```

## Relationship To Existing v1 Documents

Handoff v1 is conservative and document-driven.

This v2 principle clarifies the next operating target: normal Developer execution should not become a per-file permission workflow.

Existing approval-waiting documents still apply when no approved execution scope exists or when a role needs to expand beyond the approved scope.

## Human Director Intent

The human developer is the supervisor of the whole system, not the line manager approving every individual code edit.

For an approved task, mistakes should be handled through review, validation, fixes, or rollback rather than pre-approving every small implementation step.
