# [Skill Design] Dust Land - Volume 1. Skills

## 0. Common Specification
- **Data Format:** JSON (via `JsonDataManager`)
- **Rendering:** GDI+ (Alpha Blending, PathGradient)
- **State System:** Discovery -> Unlock -> Acquisition

---

## 1. Active Skills

### [ID: 0] 먼지 돌풍 (Dust Blast)
- **Concept:** 직선 관통형 공격
- **Mechanics:** - 주인공 정면 방향으로 투사체 발사.
  - `proj_lifetime_` 동안 모든 적을 관통하며 다단 히트.
- **Data:**
  | Damage | Speed | Cooldown |
  | :--- | :--- | :--- |
  | 12 (Flat) | 1000 | 3.0s |

### [ID: 1] 부식 (Corrosion)
- **Concept:** 광역 장판형 CC 및 DoT
- **Mechanics:** - `area_of_effect_` 반경 내 적들에게 '이동 불가' 상태 부여.
  - 1초 간격으로 지속 피해 적용.
- **Data:**
  | AoE | Duration | Interval | Damage |
  | :--- | :--- | :--- | :--- |
  | 100 | 3.0s | 1.0s | 3 |

### [ID: 3] 보풀 위성 (Lint Satellite)
- **Concept:** 공전형 방어 위성
- **Mechanics:** - 주인공 주변을 `proj_speed_` 속도로 회전.
  - 근접한 적에게 지속적인 넉백과 피해.
- **Data:**
  | Count | Orbit Radius | Rotation Speed |
  | :--- | :--- | :--- |
  | 2 | 120 | 180 deg/s |

---

## 2. Utility Skills

### [ID: 2] 다크사이트 (Darksight)
- **Concept:** 은신 및 가속 (회피기)
- **Mechanics:** - 지속 시간 동안 무적 판정 및 이동 속도 1.5배 증가.
  - GDI+ `ColorMatrix`를 활용한 반투명 연출 및 잔상 효과.
- **Data:**
  | Duration | Cooldown | Speed Multiplier |
  | :--- | :--- | :--- |
  | 1.5s | 4.0s | 1.5x |