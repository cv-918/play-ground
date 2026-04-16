#pragma once

#include "IEnemyAbility.h"

/**
 * @brief 적의 투사체 공격을 담당하는 Ability입니다.
 *
 * 책임:
 * - 공격 쿨다운 관리
 * - Move 상태에서 공격 가능 시 Attack 상태 진입 요청
 * - Attack 상태 진입 시 발사 모션 초기화
 * - 발사 모션 중 이동 정지
 * - 특정 시점에 1회 투사체 생성
 * - 발사 종료 후 Move 상태 복귀 요청
 *
 * 주의:
 * - 현재 EnemyJsonInfo에 공격 범위 / 공격 모션 시간 / 발사 쿨다운 필드가 없으므로,
 *   1차 구현은 현재 존재하는 projectile_pattern_, projectile_damage_, projectile_speed_ 및
 *   내부 기본값을 사용합니다.
 * - 이후 EnemyJsonInfo 확장 시 내부 상수는 데이터 기반으로 교체합니다.
 */
class ProjectileAttackAbility final : public IEnemyAbility
{
public:
	EnemyAbilityType Type() const override { return EnemyAbilityType::ProjectileAttack; }

public:
	void OnInitialize(Enemy& _enemy) override;
	_bool CanEnterState(const Enemy& _enemy, EnemyActionState _state) const override;
	void OnEnterState(Enemy& _enemy, EnemyActionState _state) override;
	void OnUpdate(Enemy& _enemy, _double _delta_time) override;
	void OnExitState(Enemy& _enemy, EnemyActionState _state) override;

private:
	_bool _CanStartAttack(const Enemy& _enemy) const;
	void _TryStartAttack(Enemy& _enemy);
	void _UpdateAttack(Enemy& _enemy, _double _delta_time);
	void _SpawnProjectile(Enemy& _enemy);

private:
	_double fire_cooldown_acc_ = 0.0;
	_double attack_motion_elapsed_ = 0.0;

	_double fire_interval_ = 0.0;
	_double attack_motion_duration_ = 0.0;

	_float attack_range_ = 0.f;

	_bool fired_in_current_attack_ = false;
};