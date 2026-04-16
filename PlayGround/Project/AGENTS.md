# AGENTS.md

## Core Architecture Principles

- Always preserve production-grade architecture. Never introduce temporary or throwaway designs.
- Define final architecture first, then implement a reduced-scope version of the same structure.
- Do NOT simplify structure. Only reduce implementation scope.
- Maintain strict separation of concerns:
  - Decision
  - Execution
  - Data
- Do not accumulate large if/switch logic in a single class.
- Favor modular and composable designs over monolithic structures.
- Avoid unnecessary abstraction unless it provides clear structural benefit.
- All designs must be scalable, consistent, debuggable, and traceable.

---

## Design Principles (Project-Specific)

- Do not implement temporary solutions under any circumstances.
- All systems must reflect final-form architecture from the start.
- Reduce volume, not structure.
- Responsibility separation is mandatory:
  - Decision / Execution / Data must never be merged.
- Prioritize extensibility:
  - New features should not require modification of existing systems.

### Forbidden Patterns

- Hardcoded branching expansion
- Feature accumulation via if/switch inside core classes (e.g., Enemy)
- Ad-hoc addition of state/ability without structural integration

(Reference: :contentReference[oaicite:0]{index=0})

---

## Gameplay Architecture Rules

### FSM
- Responsible ONLY for state transitions and high-level decisions
- Must NOT contain execution logic

### Ability System
- Encapsulates behavior execution (e.g., dash, attack)
- Triggered by FSM decisions
- Must not contain state transition logic

### Movement
- Pure execution layer for movement
- Must not contain decision-making logic

### Data Objects
- Must not contain decision logic
- Serve as passive state holders only

---

## Design Validation Rule

- Before implementation, always validate:
  - Responsibility boundaries
  - Data flow between systems
  - Ownership of state and behavior
- Do not proceed to implementation if structure is unclear
- Exception:
  - If the user explicitly prioritizes speed AND reduced-scope implementation is possible,
    implementation may proceed with mandatory documentation of future structural changes

---

## Step Execution Rule

All tasks must follow this sequence:

1. Structure analysis
2. Structural validation
3. Scoped modification proposal
4. Implementation

Exception:
- For simple tasks, immediate modification is allowed

---

## Definition of Simple Task

A task is considered simple ONLY if all conditions are met:

- Logic is simple
- Impact scope is localized
- Not part of a shared or critical execution path

When a task qualifies as a simple task, prioritize execution speed over process strictness.

---

## Change Impact Rule

Before modifying code:

- Identify affected systems
- Describe impact scope
- Predict side effects

Exception:
- For simple tasks (as defined above), immediate modification is allowed

---

## Structural Decision Priority

- If existing structure is incorrect → prioritize structural correction over minimal change
- If existing structure is temporary or ad-hoc → refactor before extending
- Even under speed requirements:
  - Temporary design is NOT allowed
  - Only reduced-scope implementation based on correct structure is permitted

---

## Structural Preservation Rule

- Prefer adapting to existing correct architecture
- Do NOT introduce parallel systems without explicit justification

---

## Debuggability Rule

- All logic must be traceable through explicit call flow
- Avoid hidden state transitions or implicit behavior
- Execution paths must be predictable and observable

---

## Performance Awareness Rule

- Performance must be evaluated in performance-critical paths:
  - Frame loop
  - Repeated calls
  - Frequent allocations/deallocations
  - Rendering/update paths

- In performance-critical paths:
  - Performance optimization is required

- Outside performance-critical paths:
  - Structure takes priority

- If optimization requires large structural changes:
  - Do NOT proceed automatically
  - Request direction for optimization strategy

---

## Over-Engineering Prevention Rule

- Do not introduce abstraction without clear structural benefit

- Introduce extensible structure ONLY if:
  - The same responsibility appears 2 or more times, OR
  - Expansion is clearly expected within:
    - The same work session, OR
    - The explicitly defined task scope

- Otherwise:
  - Avoid unnecessary abstraction

---

## Data-Oriented Rule

- Clearly define ownership of data
- Avoid duplicating state across systems

### Cache Policy

Cache is allowed ONLY if all conditions are met:

- Computation cost is high
- Call frequency is high
- Cache ownership is clearly defined
- Cache update timing is explicitly controlled

- Cache must:
  - NOT replace single source of truth
  - Be treated as derived data only

---

## Implementation Guidelines

- Define responsibility boundaries before writing code
- Maintain explicit and traceable data flow
- Prefer composition over inheritance where applicable
- Keep implementation minimal while preserving architecture

---

## Codex Execution Rules

- Do not rewrite unrelated systems
- Identify affected files before making changes
- Prefer minimal-scope modifications aligned with correct architecture
- Do not introduce structural deviations for convenience

---

## Response Requirements

When analyzing or modifying code:

- Clearly define responsibility boundaries
- Explicitly describe data flow
- Provide concrete code-level changes
- Avoid vague or abstract explanations

When tradeoffs exist:

- Explain why the chosen approach is used
- Specify what problems it avoids
- Define what constraints it introduces