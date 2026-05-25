# 폴더 용도: Handoff Packets

## 목적

이 폴더는 구조화된 Handoff Packet 폴더를 보관한다.

Packet은 역할 간 업무 전달 단위다. 필수 `manifest.yaml`과 필요한 보조 문서, 예를 들어 기획 브리프, 구현 요청, 승인 요청, 리뷰 요청, QA 요청, 리소스 안내, 결과, 완료 노티를 함께 둔다.

## 여기에 둘 것

- `HANDOFF-YYYYMMDD-###-short-slug` 형식의 Packet 폴더
- Packet manifest
- Packet별 기획, 구현, 아트, 리뷰, QA, 완료 문서
- Packet별 결과 문서
- 실제 에셋 위치를 가리키는 리소스 안내

## 여기에 두지 않을 것

- 대용량 원본 바이너리 에셋
- 소스 코드 변경 파일
- 런타임 산출물
- 로컬 머신 설정
- `_DevLog/`에만 있어야 하는 완료 이력
- `tools/`에 두어야 하는 자동화 스크립트

## 필수 Packet 파일

모든 Packet 폴더에는 다음 파일이 있어야 한다.

```text
manifest.yaml
```

`_Manifest_Template.yaml`을 시작점으로 사용한다.

## 주의

`delivery_status: Ready`를 실행 승인으로 오해하지 않는다.

높은 위험 실행은 소스 코드, 데이터 스키마, 런타임 동작, 빌드 설정, Git 상태를 바꾸기 전에 `execution_status: WaitingUserApproval`과 승인 요청 문서를 사용해야 한다.
