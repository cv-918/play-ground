#pragma once

#include "IEnemyAbility.h"

/**
 * @brief 적의 돌진 공격을 담당하는 Ability입니다.
 *
 * 책임:
 * - Move 상태에서 돌진 가능 여부 판단
 * - Attack 상태 진입 시 돌진 시작
 * - 돌진 종료 후 Recovery(그로기) 진행
 * - 종료 시 Move 상태 복귀 요청
 *
 * 주의:
 * - 전역 상태는 Attack만 사용하고,
 *   세부 단계는 DashAbility 내부 phase로 관리합니다.
 * - 현재 EnemyJsonInfo에 Dash 전용 데이터가 없으므로
 *   1차 구현은 내부 기본값을 사용합니다.
 */
class DashAbility final : public IEnemyAbility
{
private:
	enum class DashPhase
	{
		None = 0,
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

private:
	_bool _CanStartDash(const Enemy& _enemy) const;
	void _TryStartDash(Enemy& _enemy);
	void _UpdateAttack(Enemy& _enemy, _double _delta_time);

private:
	DashPhase phase_ = DashPhase::None;

	_double dash_cooldown_acc_ = 0.0;
	_double recovery_elapsed_ = 0.0;

	_double dash_cooldown_ = 0.0;
	_float dash_speed_ = 0.f;
	_double dash_duration_ = 0.0;
	_double recovery_duration_ = 0.0;
};