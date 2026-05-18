# Studio RoleRunOutput Materializations

This folder stores `RoleRunOutputMaterialization` records.

A materialization records which durable draft records were created from a
StaffAgent output:

- Proposal drafts
- Memory drafts or proposed memory
- WorkOrder drafts
- Handoff proposals

Materialization is not approval.

Human Director review of materialized records is stored as `Decision` records
through:

```bat
tools\aiworkflow\studio_materialization_review.bat plan <materialization_id> --decision approve --target all
tools\aiworkflow\studio_materialization_review.bat record <materialization_id> --decision approve --target all --execute
```

Those decisions are still evidence for downstream governance. They do not run
the accepted records by themselves.

It must not:

- create AIWorkflow Backlog tasks
- approve work
- write canon memory directly
- change project source files
- commit or push

Canon, implementation, task creation, and commit decisions still require the
normal Human Director governance gates.
