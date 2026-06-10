# M004/M005 Animation Resource Check

Status: Read-only validation record
Date: 2026-06-10
Author / acting agent: Hermes Super Bot Stage 1
Session / execution surface: Discord / Hermes, reviewed from CLI
Related context: `_Docs/AIWorkflow/Studio/ResultReviews/2026-06-10_enemy_animation_context_map.md`

## 1. 판정

PASS — M004/M005의 `Enemy.json` animation clip 정의와 실제 PNG 리소스 파일 존재 여부를 read-only로 대조했다.

요약:

- M004: runtime 기준으로 필요한 리소스는 모두 존재하는 것으로 확인.
- M005: runtime 기준으로 필요한 리소스는 모두 존재하는 것으로 확인.
- `hit` clip은 primary sequence path는 없지만 single-frame fallback 파일이 존재하므로 `Fallback OK`로 분류.
- 수정/생성/삭제는 수행하지 않음.

## 2. 확인한 파일/폴더

```text
PlayGround/Data/Enemy.json
PlayGround/Project/Gameplay/Actors/Stage/Enemy.cpp
PlayGround/Data/Resources/Textures/Characters/Enemies/Lv.4/
PlayGround/Data/Resources/Textures/Characters/Enemies/Lv.5/
```

## 3. 판정 기준

- Primary sequence path: `directory + prefix + 3-digit-index + .png`
- Single-frame fallback path: `directory + prefix + .png`
- `start_index_ == end_index_`이고 primary가 없으며 single-frame fallback이 있으면 `Fallback OK`로 분류.

## 4. M004 - 돌체 clip 정의와 리소스 대조

기본 정보:

```text
id_ = 4
name_ = M004 - 돌체
ability_flags_ = 3
attack_motion_duration_ = 0.0
projectile_pattern_ = 0
```

| clip | JSON directory | prefix | range | fps | loop | expected primary | actual existing | missing primary | 판정 |
|---|---|---:|---:|---:|---|---:|---:|---|---|
| move | `Data/Resources/Textures/Characters/Enemies/Lv.4/move/` | `Lv4_move_` | 1-4 | 8.0 | true | 4 | 4 | 없음 | OK |
| hit | `Data/Resources/Textures/Characters/Enemies/Lv.4/` | `Lv4_hit` | 1-1 | 8.0 | false | 1 | 0 primary / 1 fallback | Lv4_hit001.png | Fallback OK |
| attack | `Data/Resources/Textures/Characters/Enemies/Lv.4/attack/` | `Lv4_attack_` | 1-20 | 8.0 | false | 20 | 20 | 없음 | OK |
| death | `Data/Resources/Textures/Characters/Enemies/Lv.4/die/` | `Lv4_die_` | 1-3 | 8.0 | false | 3 | 3 | 없음 | OK |


## 5. M005 - 슈터 clip 정의와 리소스 대조

기본 정보:

```text
id_ = 5
name_ = M005 - 슈터
ability_flags_ = 5
attack_motion_duration_ = 1.25
projectile_pattern_ = 1
```

| clip | JSON directory | prefix | range | fps | loop | expected primary | actual existing | missing primary | 판정 |
|---|---|---:|---:|---:|---|---:|---:|---|---|
| move | `Data/Resources/Textures/Characters/Enemies/Lv.5/move/` | `Lv5_move_` | 1-4 | 8.0 | true | 4 | 4 | 없음 | OK |
| search | `Data/Resources/Textures/Characters/Enemies/Lv.5/search/` | `Lv5_search_` | 1-4 | 8.0 | false | 4 | 4 | 없음 | OK |
| hit | `Data/Resources/Textures/Characters/Enemies/Lv.5/` | `Lv5_hit` | 1-1 | 8.0 | false | 1 | 0 primary / 1 fallback | Lv5_hit001.png | Fallback OK |
| attack | `Data/Resources/Textures/Characters/Enemies/Lv.5/attack/` | `Lv5_attack_` | 1-9 | 8.0 | false | 9 | 9 | 없음 | OK |
| death | `Data/Resources/Textures/Characters/Enemies/Lv.5/die/` | `Lv5_die_` | 1-4 | 8.0 | false | 4 | 4 | 없음 | OK |


## 6. 확인된 missing/mismatch 후보

Primary sequence path 기준으로는 다음 파일이 없다:

```text
Data/Resources/Textures/Characters/Enemies/Lv.4/Lv4_hit001.png
Data/Resources/Textures/Characters/Enemies/Lv.5/Lv5_hit001.png
```

하지만 둘 다 single-frame clip이고 fallback 파일이 존재한다:

```text
Data/Resources/Textures/Characters/Enemies/Lv.4/Lv4_hit.png
Data/Resources/Textures/Characters/Enemies/Lv.5/Lv5_hit.png
```

따라서 현재 read-only 대조 기준에서 실제 runtime missing으로 보이는 항목은 없다.

## 7. 주의점

- 이 검증은 파일 존재 여부와 코드상 fallback 가능성 확인이다.
- 실제 화면에서 hit/attack/search가 의도대로 보이는지는 runtime visual validation이 필요하다.
- M004의 `attack_motion_duration_ = 0.0`은 리소스 mismatch가 아니라 behavior/timing 분석 대상이다.
- M005의 `search` → `attack` 전환은 projectile ability runtime 흐름 분석 대상이다.

## 8. Completion / Gap Analysis

- 완료 상태: read-only resource consistency check 완료
- 변경한 파일: 이 ResultReview 문서 생성 외 게임 source/data/asset 변경 없음
- 실행한 검증: Enemy.json parse, file existence check, git status/diff check 예정
- 미수행 검증: build/run/visual validation은 scope 밖
- scope deviation: no
- reapproval needed: no for this record; yes for any source/data/asset/runtime change
- commit recommendation: commit after human review if this record is useful
