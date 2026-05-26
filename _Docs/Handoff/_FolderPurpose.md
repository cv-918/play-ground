# Folder Purpose: Handoff

## Purpose

This folder is the shared handoff space for role-based chats and collaborators.

Use this folder when one role, such as planning, development, art, review, or QA, needs to pass prepared work to another role. It stores handoff-ready documents, resource notes, review requests, QA requests, completion notices, and related coordination material.

This folder supplements the existing AIWorkflow. It does not replace `_Docs/AIWorkflow/`, `_DevLog/`, or task-specific execution requests.

## Belongs Here

- Role-to-role handoff documents
- Planning briefs prepared for development, art, review, or QA
- Resource delivery notes
- Implementation request notes
- Review requests and review results
- QA requests and QA results
- Development completion notices
- Links to related files, commits, task requests, and Dev Logs

## Does Not Belong Here

- AIWorkflow source-of-truth rules
- Runtime source code
- Raw temporary execution artifacts
- Local machine configuration
- Large binary resources that belong in project resource folders or external asset storage
- Completed investigation/fix history that belongs in `_DevLog/`

## Folder Map

- `Intake/`: incoming handoffs that still need triage
- `Packets/`: structured Handoff Packet folders with manifest files
- `Dashboard.md`: generated human-facing Handoff status board
- `Queues/`: generated role-specific work intake queues
- `Violations/`: generated Handoff consistency and policy issue reports
- `Role_Routines/`: role-specific Handoff operating routines
- `Scanner/`: read-only scanner report templates and query examples
- `Status_Updates/`: document-only Handoff status update record templates
- `Guide/`: user-facing Handoff guide documents
- `Planning/`: planning and design handoffs
- `Resources/`: resource delivery notes and asset usage guidance
- `Implementation/`: implementation request handoffs
- `Review/`: review requests and review results
- `QA/`: QA requests, test scenarios, and QA results
- `Done/`: completion notices and delivery confirmations
- `Archive/`: inactive or superseded handoff documents

## Relationship To Existing Workflow

- `_Docs/AIWorkflow/` remains the source of truth for AI workflow rules and protocol.
- `_DevLog/` remains the place for completed work records, fix logs, investigations, and retrospectives.
- `_Temp/` remains for untracked temporary runtime artifacts.
- `_Docs/Handoff/` is the shared exchange space between roles before, during, or after work transfer.

## Korean Summary

이 폴더는 기획, 개발, 아트, 리뷰, QA 같은 역할 간 작업 전달을 위한 공용 교환소입니다.

기존 AIWorkflow를 대체하지 않습니다. AIWorkflow는 계속 운영 규칙의 기준이고, Handoff는 역할 간 전달물, 준비물, 리뷰 요청, QA 요청, 완료 노티를 모아두는 보조 구조입니다.
