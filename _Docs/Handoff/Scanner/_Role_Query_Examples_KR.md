# 읽기 전용 Handoff 스캐너 요청 예시

## 목적

이 문서는 사용자가 역할 채팅 또는 Codex에게 Handoff 상태 확인을 요청할 때 사용할 수 있는 문장 예시를 제공한다.

이 요청들은 모두 읽기 전용이어야 한다.

## 전체 상태 확인

```text
현재 Handoff 전체 큐를 읽기 전용으로 확인해줘.
```

```text
Handoff Packet 목록과 상태를 요약해줘. 파일은 수정하지 마.
```

## 승인 대기 확인

```text
현재 Handoff 승인 대기 목록 확인해줘.
```

```text
Waiting User Approval 상태인 Packet만 읽어서 보여줘.
```

## 역할별 확인

```text
Developer 역할에게 온 새 Packet만 확인해줘.
```

```text
QA가 처리해야 하는 Handoff만 읽기 전용으로 요약해줘.
```

```text
Reviewer에게 배정된 리뷰 요청이 있는지 확인해줘.
```

## 정합성 확인

```text
Handoff Packet manifest와 00_Index.md 정합성을 읽기 전용으로 점검해줘.
```

```text
manifest가 없는 Packet, 없는 문서를 가리키는 manifest, 승인 대기인데 index에 없는 항목을 찾아줘.
```

## 안전 조건을 함께 말하는 요청

```text
읽기만 해. claim, 상태 변경, 파일 수정, 테스트 실행, 커밋, 푸시는 하지 말고 Handoff 현황만 보고해줘.
```
