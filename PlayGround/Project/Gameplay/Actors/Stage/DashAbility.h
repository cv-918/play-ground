#pragma once

#include "IEnemyAbility.h"

struct ParticleSetting;

/**
 * @brief 적의 돌진 공격을 담당하는 Ability입니다.
 *
 * 책임:
 * - Move 상태에서 돌진 가능 여부 판단
 * - Attack 상태 진입 시 Charging/Dashing 서브 phase 시작
 * - 돌진 종료 후 Recovery(그로기) 진행
 * - 종료 시 Move 상태 복귀 요청
 *
 * 주의:
 * - 전역 상태는 Attack만 사용하고,
 *   세부 단계는 DashAbility 내부 phase로 관리합니다.
 */
class DashAbility final : public IEnemyAbility
{
private:
	enum class DashPhase
	{
		None = 0,
		Charging,
		Dashing,
		Recovery,
	};

public:
	EnemyAbilityType Type() const override { return EnemyAbilityType::Dash; }

public:
	void OnInitialize(Enemy& _enemy) override;
	_bool CanEnterState(const Enemy& _enemy, EnemyActionState _state) const override;
	void OnEnterState(Enemy& _enemy, EnemyActionState _state) override;
	void OnUpdate(Enemy& _enemy, _double _delta_time) override;
	void OnExitState(Enemy& _enemy, EnemyActionState _state) override;
	_bool ShouldSuppressHitState(const Enemy& _enemy) const override;
	_bool ShouldSuppressKnockback(const Enemy& _enemy) const override;

private:
	_bool _CanStartDash(const Enemy& _enemy) const;
	void _TryStartDash(Enemy& _enemy);
	void _UpdateAttack(Enemy& _enemy, _double _delta_time);
	void _StartCharging(Enemy& _enemy);
	void _StartDash(Enemy& _enemy);
	void _UpdateCharging(Enemy& _enemy, _double _delta_time);
	void _EmitChargeParticleBurst(Enemy& _enemy);

private:
	DashPhase phase_ = DashPhase::None;

	_double dash_cooldown_acc_ = 0.0;
	_double charge_elapsed_ = 0.0;
	_double charge_emit_acc_ = 0.0;
	_double recovery_elapsed_ = 0.0;

	_double dash_cooldown_ = 0.0;
	_float dash_speed_ = 0.f;
	_double dash_duration_ = 0.0;
	_double charge_duration_ = 0.0;
	_double recovery_duration_ = 0.0;

	const ParticleSetting* charge_particle_setting_ = nullptr;
};
