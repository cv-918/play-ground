#include "framework.h"
#include "ProjectileAttackAbility.h"

#include "Enemy.h"

#include "Actors/GameObjectBase.h"
#include "Gameplay/Scenes/InGameScene.h"
#include "Components/Movement.h"

void ProjectileAttackAbility::OnInitialize(Enemy& _enemy)
{
	fire_cooldown_acc_ = 0.0;
	attack_motion_elapsed_ = 0.0;
	fired_in_current_attack_ = false;

	const auto* info = _enemy.GetEnemyInfo();
	if (nullptr == info)
		return;

	attack_range_ = info->attack_range_;
	attack_motion_duration_ = info->attack_motion_duration_;

	// 기존 공통 attack_speed_를 공격 간격 계산에 활용
	fire_interval_ = std::max(0.1, DEFAULT_ATTACK_SPEED - info->attack_speed_);
}

_bool ProjectileAttackAbility::CanEnterState(const Enemy& _enemy, EnemyActionState _state) const
{
	if (EnemyActionState::Attack != _state)
		return true;

	return _CanStartAttack(_enemy);
}

void ProjectileAttackAbility::OnEnterState(Enemy& _enemy, EnemyActionState _state)
{
	if (EnemyActionState::Attack != _state)
		return;

	attack_motion_elapsed_ = 0.0;
	fired_in_current_attack_ = false;

	auto movement = _enemy.GetMovement();
	if (movement)
	{
		movement->StopImmediately();
		movement->SetAllowNormalMove(false);
	}
}

void ProjectileAttackAbility::OnUpdate(Enemy& _enemy, _double _delta_time)
{
	fire_cooldown_acc_ += _delta_time;

	switch (_enemy.GetActionState())
	{
	case EnemyActionState::Move:
		_TryStartAttack(_enemy);
		break;

	case EnemyActionState::Attack:
		_UpdateAttack(_enemy, _delta_time);
		break;

	default:
		break;
	}
}

void ProjectileAttackAbility::OnExitState(Enemy& _enemy, EnemyActionState _state)
{
	if (EnemyActionState::Attack != _state)
		return;

	auto movement = _enemy.GetMovement();
	if (movement)
	{
		movement->SetAllowNormalMove(true);
	}

	attack_motion_elapsed_ = 0.0;
	fired_in_current_attack_ = false;
}

_bool ProjectileAttackAbility::TryGetAnimationRequest(const Enemy& _enemy, EnemyAnimationRequest& _out_request) const
{
	if (_enemy.GetActionState() != EnemyActionState::Attack)
		return false;

	if (attack_motion_duration_ <= 0.0)
		return false;

	const _double fire_time = attack_motion_duration_ * 0.5;
	if (!fired_in_current_attack_ && attack_motion_elapsed_ < fire_time)
	{
		_out_request.clip_name_ = L"search";
		_out_request.elapsed_ = attack_motion_elapsed_;
		_out_request.duration_ = fire_time;
		return true;
	}

	_out_request.clip_name_ = L"attack";
	_out_request.elapsed_ = std::max(0.0, attack_motion_elapsed_ - fire_time);
	_out_request.duration_ = std::max(0.0001, attack_motion_duration_ - fire_time);
	return true;
}

_bool ProjectileAttackAbility::_CanStartAttack(const Enemy& _enemy) const
{
	const auto* info = _enemy.GetEnemyInfo();
	if (nullptr == info)
		return false;

	if (ProjectilePattern::Undefined == info->projectile_pattern_)
		return false;

	if (fire_cooldown_acc_ < fire_interval_)
		return false;

	auto* target = _enemy.GetPrimaryTarget();
	if (nullptr == target)
		return false;

	const auto enemy_pos = _enemy.GetTransform()->Position();
	const auto target_pos = target->GetTransform()->Position();

	const auto to_target = target_pos - enemy_pos;
	const auto distance_sq = to_target.LengthSq();
	const auto range_sq = attack_range_ * attack_range_;

	return distance_sq <= range_sq;
}

void ProjectileAttackAbility::_TryStartAttack(Enemy& _enemy)
{
	if (!_CanStartAttack(_enemy))
		return;

	_enemy.RequestChangeState(EnemyActionState::Attack);
}

void ProjectileAttackAbility::_UpdateAttack(Enemy& _enemy, _double _delta_time)
{
	auto* target = _enemy.GetPrimaryTarget();
	if (nullptr == target)
	{
		_enemy.RequestChangeState(EnemyActionState::Move);
		return;
	}

	const auto target_pos = target->GetTransform()->Position();
	_enemy.FaceTo(target_pos);

	attack_motion_elapsed_ += _delta_time;

	if (!fired_in_current_attack_ && attack_motion_elapsed_ >= attack_motion_duration_ * 0.5)
	{
		_SpawnProjectile(_enemy);
		fired_in_current_attack_ = true;
		fire_cooldown_acc_ = 0.0;
	}

	if (attack_motion_elapsed_ >= attack_motion_duration_)
	{
		_enemy.RequestChangeState(EnemyActionState::Move);
	}
}

void ProjectileAttackAbility::_SpawnProjectile(Enemy& _enemy)
{
	auto* scene = _enemy.GetPlayScene();
	if (nullptr == scene)
		return;

	const auto* info = _enemy.GetEnemyInfo();
	if (nullptr == info)
		return;

	auto* target = _enemy.GetPrimaryTarget();
	if (nullptr == target)
		return;

	const auto target_pos = target->GetTransform()->Position();
	const auto enemy_pos = _enemy.GetTransform()->Position();
	const auto fire_direction = (target_pos - enemy_pos).Normalized();
	const _Vector3 side_direction{ -fire_direction.y, fire_direction.x, 0.f };
	const auto muzzle_offset =
		fire_direction * info->projectile_spawn_offset_x_ +
		side_direction * info->projectile_spawn_offset_y_;
	const auto pos = enemy_pos + muzzle_offset;

	switch (info->projectile_pattern_)
	{
	case ProjectilePattern::Direct:
	case ProjectilePattern::Aimed:
	{
		const _float speed = (info->projectile_speed_ > 0.f) ? info->projectile_speed_ : 240.f;
		const auto reaction = MakeHitReactionProfile(
			info->projectile_impact_,
			info->projectile_knockback_distance_world_px_,
			info->projectile_knockback_duration_sec_,
			info->projectile_knockback_curve_,
			info->projectile_camera_shake_scale_);

		scene->SpawnProjectile(&_enemy, pos, target_pos, info->projectile_damage_, speed, reaction);
	}
	break;

	default:
		break;
	}
}
