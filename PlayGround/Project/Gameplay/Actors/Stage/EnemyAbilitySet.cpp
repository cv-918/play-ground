#include "framework.h"
#include "EnemyAbilitySet.h"

#include "Enemy.h"

_bool EnemyAbilitySet::AddAbility(std::unique_ptr<IEnemyAbility> _ability)
{
	if (!_ability)
		return false;

	const auto type = _ability->Type();
	if (EnemyAbilityType::Undefined == type)
		return false;

	if (FindAbility(type) != nullptr)
	{
		// 동일 타입의 Ability 중복 등록 방지
		return false;
	}

	abilities_.push_back(std::move(_ability));
	return true;
}

IEnemyAbility* EnemyAbilitySet::FindAbility(EnemyAbilityType _type)
{
	for (const auto& ability : abilities_)
	{
		if (ability && ability->Type() == _type)
			return ability.get();
	}

	return nullptr;
}

const IEnemyAbility* EnemyAbilitySet::FindAbility(EnemyAbilityType _type) const
{
	for (const auto& ability : abilities_)
	{
		if (ability && ability->Type() == _type)
			return ability.get();
	}

	return nullptr;
}

void EnemyAbilitySet::InitializeAll(Enemy& _enemy)
{
	for (const auto& ability : abilities_)
	{
		if (!ability)
			continue;

		ability->OnInitialize(_enemy);
	}
}

void EnemyAbilitySet::OnEnterState(Enemy& _enemy, EnemyActionState _state)
{
	for (const auto& ability : abilities_)
	{
		if (!ability)
			continue;

		ability->OnEnterState(_enemy, _state);
	}
}

void EnemyAbilitySet::OnUpdate(Enemy& _enemy, _double _delta_time)
{
	for (const auto& ability : abilities_)
	{
		if (!ability)
			continue;

		ability->OnUpdate(_enemy, _delta_time);
	}
}

void EnemyAbilitySet::OnExitState(Enemy& _enemy, EnemyActionState _state)
{
	for (const auto& ability : abilities_)
	{
		if (!ability)
			continue;

		ability->OnExitState(_enemy, _state);
	}
}

_bool EnemyAbilitySet::CanEnterState(const Enemy& _enemy, EnemyActionState _state) const
{
	for (const auto& ability : abilities_)
	{
		if (!ability)
			continue;

		if (!ability->CanEnterState(_enemy, _state))
			return false;
	}

	return true;
}

_bool EnemyAbilitySet::ShouldSuppressHitState(const Enemy& _enemy) const
{
	for (const auto& ability : abilities_)
	{
		if (!ability)
			continue;

		if (ability->ShouldSuppressHitState(_enemy))
			return true;
	}

	return false;
}

_bool EnemyAbilitySet::ShouldSuppressKnockback(const Enemy& _enemy) const
{
	for (const auto& ability : abilities_)
	{
		if (!ability)
			continue;

		if (ability->ShouldSuppressKnockback(_enemy))
			return true;
	}

	return false;
}

void EnemyAbilitySet::OnCollisionEnter(Enemy& _enemy, Collider* _this, Collider* _other)
{
	for (const auto& ability : abilities_)
	{
		if (!ability)
			continue;

		ability->OnCollisionEnter(_enemy, _this, _other);
	}
}

void EnemyAbilitySet::OnCollisionStay(Enemy& _enemy, Collider* _this, Collider* _other)
{
	for (const auto& ability : abilities_)
	{
		if (!ability)
			continue;

		ability->OnCollisionStay(_enemy, _this, _other);
	}
}
