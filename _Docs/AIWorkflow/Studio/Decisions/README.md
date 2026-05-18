# Studio Decisions

## Purpose

This folder stores governed `Decision` records made by the Human Director or a
delegated deterministic policy.

A decision is the boundary between an idea and an approved direction.

## Decision Types

- `approve`: approve scoped work or direction without making it canon.
- `reject`: reject a proposal or direction.
- `defer`: keep the item open for later.
- `request_changes`: ask for a focused revision.
- `accept_concerns`: accept known concerns with explicit notes.
- `canonize`: make a direction official canon, subject to memory policy.

## Canon Boundary

`decision_type=canonize` does not write canon memory by itself.

Canon memory must be written separately through the MemoryRecord store and must
cite the approving `DEC-*` source ref.

## Safety

Decision storage does not execute staff agents, call LLMs, modify source files,
create tasks, approve implementation, mark tasks done, commit, or push.
