# Folder Purpose: AIWorkflow

Status: Current folder-purpose map
Authority: Folder boundary summary; see `Workflow_Document_Authority_Map.md` for document-role and conflict-resolution order.

## Purpose

This folder stores the source-of-truth documents for the repository's AI Orchestrator workflow.

Use this folder for workflow rules, role definitions, approval gates, routing rules, task templates, review and validation criteria, active task state, project profiles, prompt templates, and workflow-specific request documents.

## Belongs Here

- AI Orchestrator protocol documents
- Workflow scope and operating rules
- Agent role definitions
- Human approval gate rules
- Tool routing rules
- Review and validation rules
- AIWorkflow task templates and task requests
- Project profile documents used by the workflow
- Korean required-read summaries for workflow documents

## Does Not Belong Here

- Game source code
- Game design documents unrelated to AIWorkflow operation
- Architecture documents for runtime game systems
- Dev logs for completed investigations or fixes
- Runtime artifacts from workflow execution
- Local machine configuration

## Important Boundary Notes

- `_Docs/Studio/` is the source of truth for current Studio product direction.
- `_Docs/AIWorkflow/Studio/` is an AIWorkflow-era governed records, templates,
  contracts, and SuperBot operating artifact area. Do not treat that path as the
  current Studio product-direction source of truth.
- Durable AIWorkflow evidence and governance records may live under
  `_Docs/AIWorkflow/Studio/` when they are intentionally promoted from runtime
  artifacts into reviewable records. Raw transient runtime output still belongs
  under `_Temp/`.

## Related Folders

- `_Docs/Architecture/`
- `_Docs/GameDesign/`
- `_Docs/Systems/`
- `_DevLog/WorkLog/`
- `_DevLog/FixLog/`
- `_Temp/AIWorkflowTaskRequests/`

## Korean Summary

이 폴더는 AI Orchestrator 워크플로우의 기준 문서를 보관하는 위치입니다.

AI 작업 절차, 역할, 승인 규칙, 도구 라우팅, 작업 요청서, 검토 및 검증 기준, 프로젝트 프로필처럼 AI 협업 운영에 직접 필요한 문서를 여기에 둡니다. 게임 구현 코드, 일반 게임 기획서, 런타임 시스템 설계 문서, Dev Log, 임시 실행 산출물은 이 폴더의 주 용도가 아닙니다.
