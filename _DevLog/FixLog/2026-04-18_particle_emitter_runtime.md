# Fix Log - 2026-04-18 Particle Emitter Runtime

## 계획 이행 상태
- 이번 턴에서 계획했던 v1 범위는 기능 기준으로 모두 반영되었다.
- `Emit`는 기존처럼 즉시 burst 생성 API로 유지했다.
- `ParticleService` 내부에 지속 생성 emitter runtime을 추가했다.
- `ParticleEmitterSpec`와 `ParticleEmitterDataManager`를 추가했다.
- 월드 고정 emitter와 owner 부착 emitter를 모두 지원한다.
- owner 파괴 시 callback에서 즉시 삭제하지 않고 `pending_stop_`만 세팅한 뒤, `ParticleService::Update()`에서 안전하게 정리하도록 했다.
- scene 전환 시 `ParticleService`가 singleton이라 상태가 남는 문제를 막기 위해 `SceneManager::_CleanupCurrentScene()`에서 `ClearSceneState()`를 호출하도록 했다.
- `Data/ParticleEmitter.json` 로드 경로와 project 등록까지 반영했다.

## 이번 작업의 핵심 변경
- `Project/EngineSystems/Render/ParticleData.h`
  - `ParticleEmitterSpec` 추가
  - JSON serialize / deserialize 추가
- `Project/EngineSystems/Render/ParticleService.h/.cpp`
  - `PlayEmitterAt`
  - `PlayEmitterAttached`
  - `StopEmitter`
  - `StopAllEmittersByOwner`
  - `ClearSceneState`
  - `ActiveEmitter` runtime
  - `ParticleEmitterStopReason`
  - spec validation
  - owner destruction callback 기반 정리
- `Project/Gameplay/GamePlaySystems/Json/ParticleEmitterDataManager.h/.cpp`
  - emitter spec 데이터 매니저 추가
- `Project/App/PlayGround.cpp`
  - `Data/ParticleEmitter.json` 로드 추가
- `Project/Gameplay/GamePlaySystems/SceneManager.cpp`
  - scene cleanup 시 파티클 상태 초기화
- `Project/Gameplay/Scenes/Scene.cpp`
  - 공통 `LateUpdate()`에서 파티클 서비스 업데이트
- `Project/Gameplay/Scenes/InGameScene.cpp`
  - 중복 파티클 업데이트 제거

## 리뷰

### 잘된 점
- 데이터 정의와 실행 방식이 분리되었다.
  - spec은 "얼마나 자주, 몇 개, 얼마나 오래"만 정의한다.
  - 월드 고정인지 owner 추적인지는 API가 결정한다.
- runtime이 `ParticleEmitterSpec`를 값으로 들고 있어 dangling pointer 위험이 없다.
- owner 소멸 콜백에서 컨테이너를 직접 지우지 않아서 iterator invalidation 위험이 줄었다.
- scene 전환 정리 정책이 명확해졌다.
- `PlayEmitterAttached()`의 local offset을 owner local axis(`Right2D`, `Forward2D`) 기준으로 계산해서 현재 프로젝트 transform 체계와 잘 맞는다.

### 남아 있는 리스크
- emitter 기능은 엔진 레벨 구현까지 완료되었지만, 실제 게임플레이 객체에서 아직 본격적으로 사용하지는 않는다.
- emitter/particle 상태를 디버그 UI로 보는 도구는 아직 없다.
- `ParticleEmitterStopReason`은 내부 보관만 하고 있고, 아직 별도 로그 상세 출력이나 디버그 화면 노출은 없다.
- 풀 포화 시 "다음 프레임 재시도" 정책은 들어갔지만, 드롭 통계나 경고 카운터는 없다.

### 범위 밖이라 의도적으로 보류한 것
- burst on start / burst on stop
- random interval
- prewarm
- socket / bone binding
- editor tooling
- spec id로 바로 재생하는 편의 API

## 검증 결과
- `Debug | x64` 빌드 성공
- 새 emitter 기능 추가로 인한 빌드 오류 없음
- 남은 경고는 대부분 기존 코드에 있던 형변환 경고이며, emitter 추가로 새로 생긴 치명 문제는 확인되지 않음

## 다음 적용 우선순위
1. 플레이어/적/스킬 연출 중 하나를 골라 실제 emitter 사용처 1개 연결
2. `ParticleEmitter.json`에 실제 preset 2~3개 추가
3. debug assist에 active emitter 수 / active particle 수 표시
4. 필요하면 `PlayEmitterById(_uint emitter_id, ...)` 편의 함수 추가
