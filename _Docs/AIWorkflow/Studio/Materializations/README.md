# Studio RoleRunOutput Materializations

This folder stores `RoleRunOutputMaterialization` records.

A materialization records which durable draft records were created from a
StaffAgent output:

- Proposal drafts
- Memory drafts or proposed memory
- WorkOrder drafts
- Handoff proposals

Materialization is not approval.

It must not:

- create AIWorkflow Backlog tasks
- approve work
- write canon memory directly
- change project source files
- commit or push

Canon, implementation, task creation, and commit decisions still require the
normal Human Director governance gates.
