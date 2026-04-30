#pragma once

#include "IEnemyAbility.h"

/**
 * @brief 적의 접촉 공격을 담당하는 Ability입니다.
 *
 * 책임:
 * - 플레이어 바디와 충돌했을 때 접촉 공격 수행
 * - 대상별 접촉 공격 쿨타임 관리
 *
 * 주의:
 * - 실제 피해 적용은 대상의 Damage Handler / Combat 시스템을 통해 이뤄집니다.
 * - 이 Ability는 충돌 이벤트를 기반으로만 동작합니다.
 */
class ContactAttackAbility final : public IEnemyAbility
{
public:
	EnemyAbilityType Type() const override { return EnemyAbilityType::ContactAttack; }

public:
	void OnUpdate(Enemy& _enemy, _double _delta_time) override;
	void OnCollisionEnter(Enemy& _enemy, Collider* _this, Collider* _other) override;
	void OnCollisionStay(Enemy& _enemy, Collider* _this, Collider* _other) override;

private:
	void _TryAttackPlayer(Enemy& _enemy, Collider* _attack_col, Collider* _other);
	void _UpdateTargetCooldowns(_double _delta_time);
	_bool _IsTargetOnCooldown(Collider* _target) const;
	void _StartTargetCooldown(Collider* _target, _double _cooldown_sec);

private:
	std::map<Collider*, _double> target_cooldowns_;
};
