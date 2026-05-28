# Advisory Loop

## Definition

The Advisory Loop is the repeated discussion cycle where AI staff agents provide
role-specific opinions, objections, questions, and options before the Human
Director makes a decision.

It replaces the old assumption that every workflow starts with a detailed task.

## Flow

```text
agenda
-> staff opinions
-> proposals / objections / questions
-> Director feedback
-> more staff opinions if needed
-> decision or WorkOrder
```

## Safety Boundary

The Advisory Loop may create discussion records and candidates.

It must not directly:

- change canon
- create implementation work without approval
- edit source/data
- commit/push

