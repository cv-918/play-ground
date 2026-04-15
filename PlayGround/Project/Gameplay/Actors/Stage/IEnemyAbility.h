#pragma once

#include "EnemyTypes.h"

class Enemy;
class Collider;

/**
 * @brief 적 유닛이 보유하는 능력 모듈의 공통 인터페이스입니다.
 *
 * - Enemy는 상태 머신의 호스트 역할을 수행합니다.
 * - 각 Ability는 상태 이벤트 및 게임플레이 이벤트를 수신하고,
 *   자신의 책임 범위 내에서 이동/공격/투사체 발사 등의 세부 기능을 수행합니다.
 *
 * 주의:
 * - Ability는 ComponentBase 파생이 아닙니다.
 * - Ability는 Enemy가 소유하는 런타임 모듈입니다.
 */
class IEnemyAbility
{
public:
	virtual ~IEnemyAbility() = default;

public:
	/** @brief 런타임 능력 타입을 반환합니다. */
	virtual EnemyAbilityType Type() const = 0;

public:
	/** @brief Enemy 초기화 완료 후 1회 호출됩니다. */
	virtual void OnInitialize(Enemy& _enemy) {}

	/** @brief 특정 상태로 진입 가능한지 판단합니다. */
	virtual _bool CanEnterState(const Enemy& _enemy, EnemyActionState _state) const { return true; }

	/** @brief Enemy가 특정 상태에 진입할 때 호출됩니다. */
	virtual void OnEnterState(Enemy& _enemy, EnemyActionState _state) {}

	/** @brief Enemy 업데이트 중 매 프레임 호출됩니다. */
	virtual void OnUpdate(Enemy& _enemy, _double _delta_time) {}

	/** @brief Enemy가 특정 상태에서 빠져나갈 때 호출됩니다. */
	virtual void OnExitState(Enemy& _enemy, EnemyActionState _state) {}

public:
	/** @brief 충돌 시작 이벤트를 전달받습니다. */
	virtual void OnCollisionEnter(Enemy& _enemy, Collider* _this, Collider* _other) {}

	/** @brief 충돌 유지 이벤트를 전달받습니다. */
	virtual void OnCollisionStay(Enemy& _enemy, Collider* _this, Collider* _other) {}
};