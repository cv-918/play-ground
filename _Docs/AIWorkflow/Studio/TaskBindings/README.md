# Studio Task Bindings

This directory stores durable `WorkOrderTaskBinding` records.

A binding links a Studio `WorkOrder` to the concrete AIWorkflow Backlog task
created from it. The binding is the audit trail between Studio intent and the
existing task lifecycle.

Rules:

- A binding is not task approval.
- A binding is not completion approval.
- A binding is not commit or push approval.
- The linked Backlog task still goes through ActiveTask, approval, runner,
  evidence, verification, completion, finalization, and git gates.
- Safety flags must stay explicit so the Human Director can see what the
  WorkOrder-to-task bridge did not authorize.
