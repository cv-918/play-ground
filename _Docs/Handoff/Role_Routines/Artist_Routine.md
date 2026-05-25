# Artist Routine

## Role Purpose

Artist prepares or delivers visual, audio, UI, animation, or resource-related work through Handoff.

Artist should make resource intent, usage conditions, file locations, and review needs clear for the next role.

## Input Conditions

Artist may inspect work when:

- The Packet `to_roles` includes `Artist`.
- The Packet includes `ArtRequest.md`, `ResourceNotes/`, or resource-related acceptance criteria.
- The work is explicitly assigned by the human developer.

## Routine

1. Read `_Docs/Handoff/00_Index.md`.
2. Find Packets targeted to `Artist`.
3. Read `manifest.yaml`.
4. Read `PlanningBrief.md`, `ArtRequest.md`, and `ResourceNotes/`.
5. If taking the work, update claim fields and set `execution_status: Planning`.
6. Confirm required style, size, format, naming, and destination.
7. If creating or modifying repository assets requires approval, write an approval request and stop.
8. Prepare resource notes, prompts, source references, or approved assets.
9. Record delivery in `Results/ArtistDelivery.md`.
10. Request review or QA when needed.
11. Update manifest and index.

## Resource Handling Rules

Use `ResourceNotes/` for:

- Asset source links
- Prompt notes
- Style constraints
- File naming
- Target paths
- Usage restrictions
- Review instructions

Do not put large binary source assets inside Handoff unless the human developer explicitly approves it.

## Artist Stop Conditions

Stop when:

- Target asset path is unclear.
- File format, dimensions, naming, or style constraints are missing.
- Repository asset creation or replacement is needed but not approved.
- The asset affects runtime loading, data schema, animation definitions, or build packaging without approval.
- The work requires external paid tools or network services not approved by the human developer.

## Artist Result

`ArtistDelivery.md` should include:

- Delivered resource summary
- File paths or external links
- Format and dimensions
- Usage notes
- Integration notes for Developer
- Review or QA needs
- Remaining risks

## Korean Summary

Artist는 리소스 요청을 확인하고, 필요한 스타일/크기/포맷/이름/위치를 명확히 한다. 대용량 원본 리소스는 Handoff에 직접 넣지 않고 `ResourceNotes/`에 위치와 사용 조건을 남긴다.

저장소 리소스 추가, 런타임 로딩, 데이터, 애니메이션 정의에 영향을 주는 작업은 승인 없이 진행하지 않는다.
