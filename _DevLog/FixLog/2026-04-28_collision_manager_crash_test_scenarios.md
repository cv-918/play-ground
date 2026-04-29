# CollisionManager Crash Regression Test Scenarios - 2026-04-28

## 목적

- 몬스터 `M001`, `M002`, `M002` 3마리와 플레이어가 동시에 충돌한 직후 발생하던 `std::_Iterator_base12::_Adopt_unlocked` / 읽기 액세스 위반 재발 여부를 확인한다.
- `CollisionManager::Update()` 순회 중 충돌 콜백이 콜라이더 등록/해제를 유발해도 `layer_colliders_` 순회와 `Collider::collided_colliders_` 상태가 깨지지 않아야 한다.
- 1차 검증 환경은 `Debug|x64` + Visual Studio 디버거 attached 상태다.

## 공통 준비

1. Visual Studio에서 `PlayGround.sln`을 연다.
2. 구성을 `Debug`, 플랫폼을 `x64`로 설정한다.
3. 디버거 예외 설정에서 C++ access violation 발생 시 중단되도록 둔다.
4. 아래 breakpoint를 설정한다.
   - `CollisionManager::DeregisterCollider`
   - `CollisionManager::_FlushPendingColliderChanges`
   - `CollisionManager::_CanProcessCollider`
   - `StagePlayer::_HandleDeathIfNeeded`
5. Watch에 아래 항목을 등록한다.
   - `is_updating_`
   - `pending_registers_`
   - `pending_deregisters_`
   - `layer_colliders_[s_int(CollisionLayer::PlayerBody)]`
   - `layer_colliders_[s_int(CollisionLayer::EnemyAttack)]`
   - 플레이어 `PlayerBody` 콜라이더의 `IsEnable()` / `GameObject()->IsPendingDestruction()`

## 테스트 1. 원본 재현 조건 재검증

### 조건

- 플레이어 HP를 `M001`, `M002`, `M002`의 접촉 공격이 같은 충돌 패스에서 들어오면 즉시 사망 가능한 값으로 낮춘다.
- `M001`, `M002`, `M002` 3마리가 동시에 `PlayerBody`와 충돌하도록 배치하거나 이동시킨다.

### 절차

1. Debug x64에서 디버거 attached 상태로 실행한다.
2. 3마리 몬스터가 같은 프레임 또는 거의 같은 프레임에 플레이어 몸체와 겹치도록 유도한다.
3. 충돌 직후 Visual Studio가 `std::_Iterator_base12::_Adopt_unlocked` 또는 access violation으로 중단되는지 확인한다.
4. 같은 조건을 10회 반복한다.

### 기대 결과

- 예외 중단이 없어야 한다.
- `0xFFFFFFFFFFFFFFF7`류 비정상 포인터 접근이 없어야 한다.
- `StagePlayer::_HandleDeathIfNeeded`는 사망 1회당 한 번만 의미 있게 처리되어야 한다.
- `DeregisterCollider`가 `is_updating_ == true` 상태에서 호출되면 즉시 `layer_colliders_`를 수정하지 않고 `pending_deregisters_`에 요청을 넣어야 한다.
- `_FlushPendingColliderChanges`에서 충돌 패스 종료 후 해제가 반영되어야 한다.

## 테스트 2. 사망 직후 다음 충돌 패스 안정성

### 조건

- 테스트 1의 사망 상황 직후 이어서 진행한다.

### 절차

1. 플레이어 사망 처리 후 디버거에서 계속 실행한다.
2. 최소 5초 동안 또는 결과/사망 상태 전환이 끝날 때까지 게임 루프를 유지한다.
3. Watch에서 `PlayerBody`, `PlayerAttack`, `PlayerCollector`가 추가 충돌 처리 대상에서 제외되는지 확인한다.

### 기대 결과

- 이미 비활성화되었거나 해제 예약된 플레이어 콜라이더가 추가 충돌 콜백을 받지 않아야 한다.
- `_CanProcessCollider(PlayerBody, playerBodyCollider)`는 사망 직후 false가 되어야 한다.
- 게임 루프, 카메라 업데이트, 파티클 업데이트가 정상 지속되어야 한다.

## 테스트 3. 비사망 다중 충돌 회귀

### 조건

- 플레이어 HP를 충분히 높게 설정한다.
- `M001`, `M002`, `M002` 3마리가 동시에 플레이어와 충돌하도록 만든다.

### 절차

1. Debug x64에서 실행한다.
2. 3마리 접촉 공격을 동시에 발생시킨다.
3. 충돌 Enter 이후 Stay 구간까지 유지한다.
4. 몬스터 공격 타이머가 적용되고 재공격 주기가 유지되는지 확인한다.

### 기대 결과

- 크래시가 없어야 한다.
- 접촉 데미지가 적용되어야 한다.
- `ContactAttackAbility::_TryAttackPlayer`에서 대상이 살아있으면 `SetTimerForTarget`이 정상 호출되어야 한다.
- 수정 때문에 정상 충돌이 통째로 누락되면 실패다.

## 테스트 4. 플레이어 공격으로 다중 적 사망

### 조건

- 플레이어 공격 범위 안에 `M001`, `M002`, `M002`를 동시에 배치한다.
- 적 HP를 낮춰 같은 공격 틱에 2마리 이상 사망 가능하게 만든다.

### 절차

1. 플레이어 공격 쿨다운이 찬 상태에서 몬스터들을 공격 범위에 넣는다.
2. `StagePlayer::_TryPerformAttackTick`이 `collided_snapshot`을 기준으로 순회하는지 확인한다.
3. 적 사망 처리 중 적 콜라이더 해제가 발생해도 남은 snapshot 순회가 안전한지 확인한다.

### 기대 결과

- 크래시가 없어야 한다.
- 2마리 이상 적이 같은 공격 틱에 사망해도 데미지 UI, 경험치/보상 처리, 사망 페이드가 정상 진행되어야 한다.
- 사망한 적 콜라이더가 다음 충돌 패스에서 처리 대상에서 제외되어야 한다.

## 테스트 5. Spawn 이후 충돌 재등록 경로

### 조건

- 적 Spawn 상태가 활성화된 스테이지에서 테스트한다.
- Spawn 완료 후 Move 상태로 전환되는 몬스터를 관찰한다.

### 절차

1. Spawn 중인 적을 생성한다.
2. Spawn 상태에서 Move 상태로 전환될 때 `_EnableCombatCollisions` 경로를 확인한다.
3. 해당 경로에서 `DeregisterCollider -> RegisterCollider` 순서가 들어와도 충돌 패스 종료 후 최종 등록 상태가 정상인지 확인한다.

### 기대 결과

- Spawn 완료 후 적 `EnemyBody` / `EnemyAttack` 콜라이더가 정상 충돌해야 한다.
- 같은 콜라이더가 `layer_colliders_`에 중복 등록되지 않아야 한다.
- 재등록 직후 플레이어와 충돌해도 데미지/타이머가 정상 동작해야 한다.

## 테스트 6. 씬 전환 및 정리 안정성

### 조건

- 테스트 1 또는 테스트 4 직후 이어서 진행한다.

### 절차

1. 충돌/사망 직후 Pause, Result, OutGame 전환 또는 재시작 흐름을 수행한다.
2. `CollisionManager::ClearAllColliders` 호출 이후 pending 큐가 비워지는지 확인한다.
3. 다음 씬에서 새 플레이어/몬스터/타운 상호작용 콜라이더가 정상 등록되는지 확인한다.

### 기대 결과

- `ClearAllColliders` 이후 `pending_registers_`, `pending_deregisters_`가 비어 있어야 한다.
- 다음 씬에서 유령 충돌, 중복 콜라이더, access violation이 없어야 한다.
- 이전 씬의 콜라이더 포인터가 Watch나 충돌 목록에 남아 다음 씬에서 처리되면 실패다.

## 빌드 검증

```powershell
& 'C:\Program Files\Microsoft Visual Studio\2022\Professional\MSBuild\Current\Bin\amd64\MSBuild.exe' .\PlayGround\PlayGround.sln /p:Configuration=Debug /p:Platform=x64
& 'C:\Program Files\Microsoft Visual Studio\2022\Professional\MSBuild\Current\Bin\amd64\MSBuild.exe' .\PlayGround\PlayGround.sln /p:Configuration=Release /p:Platform=x64
```

### 기대 결과

- 두 빌드 모두 오류 없이 성공해야 한다.
- 기존 형변환 경고는 이번 크래시 검증 실패 조건에 포함하지 않는다.

## 결과 기록 템플릿

| 항목 | 결과 | 비고 |
| --- | --- | --- |
| Debug x64 빌드 | PASS / FAIL | |
| Release x64 빌드 | PASS / FAIL | |
| 테스트 1 원본 조건 10회 반복 | PASS / FAIL | 반복 횟수: |
| 테스트 2 사망 직후 5초 유지 | PASS / FAIL | |
| 테스트 3 비사망 다중 충돌 | PASS / FAIL | |
| 테스트 4 다중 적 사망 | PASS / FAIL | |
| 테스트 5 Spawn 후 재등록 | PASS / FAIL | |
| 테스트 6 씬 전환 정리 | PASS / FAIL | |

## 최종 승인 기준

- 원본 재현 조건 10회 반복 중 예외 중단이 없어야 한다.
- 플레이어 사망 처리가 중복 실행되지 않아야 한다.
- 사망/비사망/적 사망/재등록/씬 전환 케이스가 모두 정상 동작해야 한다.
- pending 등록/해제 큐는 충돌 패스 종료 또는 `ClearAllColliders` 이후 남아 있지 않아야 한다.
