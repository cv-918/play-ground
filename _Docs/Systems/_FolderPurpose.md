# Folder Purpose: Systems

## Purpose

This folder stores documentation for concrete game systems.

Use this folder to explain how individual systems behave, how they interact with data and runtime lifecycle, what assumptions they require, and how they should be validated. These documents should be more implementation-aware than game design documents, but more focused than broad architecture documents.

## Belongs Here

- Animation system behavior
- Rendering pipeline notes
- Scene flow and lifecycle rules
- Input, collision, UI, save/load, and data loading behavior
- JSON-driven system behavior and validation notes
- Component interaction rules
- Runtime order and dependency notes
- System-specific debug and troubleshooting notes

## Does Not Belong Here

- Broad repository workflow rules
- High-level game design goals
- General architecture decisions that affect many systems
- Completed fix logs
- Temporary investigation notes
- Source files or generated build outputs

## Related Folders

- `_Docs/Architecture/`
- `_Docs/GameDesign/`
- `_Docs/AIWorkflow/`
- `_DevLog/FixLog/`
- `_DevLog/WorkLog/`
- `PlayGround/`

## Korean Summary

이 폴더는 개별 게임 시스템 설명 문서를 보관하는 위치입니다.

애니메이션, 렌더링, 씬 흐름, 입력, 충돌, UI, 저장/로드, JSON 데이터 로딩처럼 구체 시스템이 어떻게 동작하고 어떤 생명주기와 검증 기준을 갖는지 정리합니다. 전체 아키텍처 결정, 상위 게임 기획, AIWorkflow 운영 규칙, 완료된 작업 로그, 소스 파일이나 빌드 산출물은 이 폴더에 두지 않습니다.
