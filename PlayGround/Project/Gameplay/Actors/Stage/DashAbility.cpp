#include "framework.h"
#include "DashAbility.h"

#include "Enemy.h"

#include "Actors/GameObjectBase.h"
#include "Components/Movement.h"

void DashAbility::OnInitialize(Enemy& _enemy)
{
	phase_ = DashPhase::None;
	recovery_elapsed_ = 0.0;

	const auto* info = _enemy.GetEnemyInfo();
	if (nullptr == info)
		return;

	dash_speed_ = info->dash_speed_;
	dash_duration_ = info->dash_duration_;
	dash_cooldown_ = info->dash_cooldown_;
	recovery_duration_ = info->dash_recovery_duration_;

	// 시작 시 바로 돌진 가능하도록 쿨다운 충전 상태로 둠
	dash_cooldown_acc_ = dash_cooldown_;
}

_bool DashAbility::CanEnterState(const Enemy& _enemy, EnemyActionState _state) const
{
	if (EnemyActionState::Attack != _state)
		return true;

	return _CanStartDash(_enemy);
}

void DashAbility::OnEnterState(Enemy& _enemy, EnemyActionState _state)
{
	if (EnemyActionState::Attack != _state)
		return;

	auto* target = _enemy.GetPrimaryTarget();
	auto* movement = _enemy.GetMovement();

	if (nullptr == target || nullptr == movement)
		return;

	const auto enemy_pos = _enemy.GetTransform()->Position();
	const auto target_pos = target->GetTransform()->Position();
	auto dash_dir = target_pos - enemy_pos;

	if (dash_dir.LengthSq() <= 0.f)
		return;

	dash_dir = dash_dir.Normalized();

	movement->SetAllowNormalMove(false);
	movement->StopImmediately();
	movement->StartDash(dash_dir, dash_speed_, dash_duration_);

	_enemy.FaceTo(target_pos);

	phase_ = DashPhase::Dashing;
	recovery_elapsed_ = 0.0;
}

void DashAbility::OnUpdate(Enemy& _enemy, _double _delta_time)
{
	dash_cooldown_acc_ += _delta_time;

	switch (_enemy.GetActionState())
	{
	case EnemyActionState::Move:
		_TryStartDash(_enemy);
		break;

	case EnemyActionState::Attack:
	{
		_UpdateAttack(_enemy, _delta_time);

		if (DashPhase::Dashing == phase_)
		{
			auto& ctx = _enemy.GetAttackContext();
			ctx.is_dash_attack_ = true;

			const auto* info = _enemy.GetEnemyInfo();
			if (info)
			{
				ctx.damage_multiplier_ = info->dash_damage_multiplier_;
				ctx.reaction_ = MakeHitReactionProfile(
					info->dash_impact_,
					info->dash_knockback_distance_world_px_,
					info->dash_knockback_duration_sec_,
					info->dash_knockback_curve_,
					info->dash_camera_shake_scale_);
			}
		}
	}
	break;

	default:
		break;
	}
}

void DashAbility::OnExitState(Enemy& _enemy, EnemyActionState _state)
{
	if (EnemyActionState::Attack != _state)
		return;

	auto* movement = _enemy.GetMovement();
	if (movement)
	{
		movement->SetAllowNormalMove(true);
	}

	phase_ = DashPhase::None;
	recovery_elapsed_ = 0.0;
	dash_cooldown_acc_ = 0.0;
}

_bool DashAbility::_CanStartDash(const Enemy& _enemy) const
{
	if (dash_cooldown_acc_ < dash_cooldown_)
		return false;

	auto* target = _enemy.GetPrimaryTarget();
	if (nullptr == target)
		return false;

	const auto enemy_pos = _enemy.GetTransform()->Position();
	const auto target_pos = target->GetTransform()->Position();

	const auto to_target = target_pos - enemy_pos;
	const auto distance_sq = to_target.LengthSq();
	const auto range_sq = 150.f * 150.f;

	return distance_sq <= range_sq;

}

void DashAbility::_TryStartDash(Enemy& _enemy)
{
	if (!_CanStartDash(_enemy))
		return;

	_enemy.RequestChangeState(EnemyActionState::Attack);
}

void DashAbility::_UpdateAttack(Enemy& _enemy, _double _delta_time)
{
	auto* movement = _enemy.GetMovement();
	if (nullptr == movement)
		return;

	switch (phase_)
	{
	case DashPhase::Dashing:
	{
		if (!movement->IsDashing())
		{
			phase_ = DashPhase::Recovery;
			recovery_elapsed_ = 0.0;

			movement->StopImmediately();
		}
	}
	break;

	case DashPhase::Recovery:
	{
		recovery_elapsed_ += _delta_time;

		if (recovery_elapsed_ >= recovery_duration_)
		{
			_enemy.RequestChangeState(EnemyActionState::Move);
		}
	}
	break;

	default:
		break;
	}
}
