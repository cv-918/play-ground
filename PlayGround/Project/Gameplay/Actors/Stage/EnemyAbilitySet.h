#pragma once

#include <memory>
#include <vector>

#include "IEnemyAbility.h"

class Enemy;
class Collider;

/**
 * @brief Enemy가 보유한 Ability 런타임 객체 집합입니다.
 *
 * 책임:
 * - Ability 객체 소유
 * - 타입 중복 방지
 * - 상태 이벤트 브로드캐스트
 * - 게임플레이 이벤트 브로드캐스트
 * - 상태 진입 가능 여부 종합 판단
 */
class EnemyAbilitySet
{
public:
	/**
	 * @brief Ability를 추가합니다.
	 *
	 * @return 성공 시 true, 실패 시 false
	 */
	_bool AddAbility(std::unique_ptr<IEnemyAbility> _ability);

public:
	/** @brief 타입으로 Ability를 찾습니다. */
	IEnemyAbility* FindAbility(EnemyAbilityType _type);

	/** @brief 타입으로 Ability를 찾습니다. (const) */
	const IEnemyAbility* FindAbility(EnemyAbilityType _type) const;

public:
	/** @brief 등록된 모든 Ability에 초기화 이벤트를 전달합니다. */
	void InitializeAll(Enemy& _enemy);

	/** @brief 상태 진입 시 모든 Ability에 이벤트를 전달합니다. */
	void OnEnterState(Enemy& _enemy, EnemyActionState _state);

	/** @brief 매 프레임 모든 Ability에 업데이트 이벤트를 전달합니다. */
	void OnUpdate(Enemy& _enemy, _double _delta_time);

	/** @brief 상태 종료 시 모든 Ability에 이벤트를 전달합니다. */
	void OnExitState(Enemy& _enemy, EnemyActionState _state);

public:
	/** @brief 충돌 시작 이벤트를 모든 Ability에 전달합니다. */
	void OnCollisionEnter(Enemy& _enemy, Collider* _this, Collider* _other);

	/** @brief 충돌 유지 이벤트를 모든 Ability에 전달합니다. */
	void OnCollisionStay(Enemy& _enemy, Collider* _this, Collider* _other);

public:
	/**
	 * @brief 해당 상태로 진입 가능한지 모든 Ability 기준으로 확인합니다.
	 *
	 * 하나라도 false를 반환하면 진입을 허용하지 않습니다.
	 */
	_bool CanEnterState(const Enemy& _enemy, EnemyActionState _state) const;

	/** @brief 등록된 Ability 수를 반환합니다. */
	_uint Count() const { return s_uint(abilities_.size()); }

private:
	std::vector<std::unique_ptr<IEnemyAbility>> abilities_;
};