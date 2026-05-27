# Planning Brief: Low-Risk Role Worker Pilot

## Packet

Handoff ID: HANDOFF-20260527-003-low-risk-role-worker-pilot

Manifest: `manifest.yaml`

## Document Type

PlanningBrief

## From

Role: Planner

## To

Role: Developer, QA

## Summary

Run Phase 11B and Phase 11C of the Handoff System v1 plan by checking whether role-worker style document-only work can be performed safely against a real completed Packet.

The source evidence is:

```text
_Docs/Handoff/Packets/HANDOFF-20260526-002-skill-shortcut-key-labels/
```

This pilot must not create fake gameplay work. It uses the completed skill shortcut key label Handoff as real prior work and asks role workers to produce intake and low-risk work reports only.

## Scope

- Confirm the pilot Packet appears in generated Developer and QA Queues as Ready Work.
- Produce a Developer intake decision.
- Produce a Developer low-risk work report.
- Produce a QA low-risk repeatability report.
- Keep all writes inside `_Docs/Handoff/`.
- Avoid source, JSON, runtime, asset, build, approval evidence, claim, Done-by-role-worker, commit, and push actions.

## Non-Goals

- No game source changes.
- No gameplay JSON changes.
- No runtime behavior changes.
- No asset work.
- No build or runtime validation.
- No role-worker automation creation.
- No recurring automation changes.
- No commit or push.

## Acceptance Criteria

- Developer and QA have clear document-only requests.
- The role-worker reports use the existing templates and identify forbidden actions.
- The pilot records that role workers did not claim, approve, mark Done, commit, or push.
- Supervisor can regenerate Dashboard, Queues, and Violations without consistency issues.

## Next Actions

- Developer reads `ImplementationRequest.md` and writes results.
- QA reads `QARequest.md` and writes repeatability results.
