# Studio WorkOrders

This folder is the durable store for approved or reviewable AIWorkflow Studio
`WorkOrder` records.

A WorkOrder is above an AIWorkflow task. It describes director-level intent,
scope, non-goals, expected outputs, approvals, evidence, and handoff plans.

Rules:

- A WorkOrder is not a Task.
- Storing a WorkOrder does not approve implementation.
- Creating a Backlog task from a WorkOrder does not approve execution.
- Task execution, completion, finalization, commit, and push remain governed by
  the existing AIWorkflow Core gates.
- Staff agents may propose WorkOrders, but deterministic policy and Human
  Director gates decide whether they can be stored or converted into tasks.

Local tool:

```bat
tools\aiworkflow\studio_workorder_planner.bat status
tools\aiworkflow\studio_workorder_planner.bat list
tools\aiworkflow\studio_workorder_planner.bat read <work_order_id>
tools\aiworkflow\studio_workorder_planner.bat store <work_order_json_path> --execute
tools\aiworkflow\studio_workorder_planner.bat plan <work_order_json_path>
tools\aiworkflow\studio_workorder_planner.bat create <work_order_json_path> --execute
```

For validation smoke tests, use `--store-path` under `_Temp`.
