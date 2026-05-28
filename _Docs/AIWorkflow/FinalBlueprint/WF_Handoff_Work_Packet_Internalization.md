# Handoff Work Packet Internalization

## 1. Purpose

This document defines the final position of the current Handoff system.

Handoff should not remain a separate user-facing product beside AIWorkflow
Studio.

It should become the internal Work Packet and dispatch layer that carries
approved scope, context, constraints, evidence requirements, validation
requirements, and output contracts between Studio, staff agents, and execution
tools.

## 2. Product Language

Use these terms in user-facing Studio surfaces:

```text
Work Packet
Execution Brief
Staff Handoff
Dispatch
```

Use `Handoff` only when inspecting internal records, debug state, or
implementation documentation.

## 3. What Handoff Keeps

Handoff remains valuable when it preserves:

- exact scope
- non-goals
- target staff role or executor
- required context
- source references
- validation requirements
- evidence requirements
- expected output contract
- handoff history
- safety and approval boundaries

## 4. What Studio Hides

Normal Director UI should not show:

- raw queue file names
- internal worker folders
- sample handoff records
- violation logs unless action is required
- packet IDs without plain-language meaning
- handoff mechanics that do not change a Director decision

These may remain available under internal/admin inspection.

## 5. Work Packet Contract

A Work Packet should answer:

1. What is the worker being asked to do?
2. What is explicitly outside scope?
3. What context is authoritative?
4. Which records are proposals, decisions, canon, lessons, or rejected ideas?
5. Which files, systems, or tools are in scope?
6. What must be validated?
7. What evidence must be returned?
8. What must the worker not approve or finalize?
9. Where should the result return?

## 6. Relationship To Context Pack

Context Pack is the memory and policy bundle.

Work Packet is the job envelope.

```text
Context Pack = what the worker needs to know
Work Packet = what the worker is allowed to do
```

A governed Handoff record may carry both.

## 7. Retirement Rule

Do not delete the current Handoff system until Studio can preserve the same
safety and traceability.

Handoff can be retired only when Studio has first-class replacements for:

- scope and non-goals
- context pack references
- role routing
- validation and evidence contracts
- output routing
- audit history

Until then, Handoff is an internal safety layer, not dead code.

## 8. Integration With Studio

Studio should expose Director-level actions:

- preview what a worker will receive
- approve or reject packet creation
- request a narrower packet
- inspect returned evidence
- route output to Proposal, Decision, Memory, WorkOrder, or Result Review

Studio should not ask the Director to manage raw Handoff queues.

## 9. Non-Negotiable Boundaries

Handoff does not:

- approve execution
- canonize memory
- create commits
- push to remote
- override Human Director decisions
- bypass AIWorkflow verification and completion gates

