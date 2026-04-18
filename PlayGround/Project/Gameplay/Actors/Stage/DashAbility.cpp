#include "framework.h"
#include "DashAbility.h"

#include "Enemy.h"

#include "Actors/GameObjectBase.h"
#include "Components/Movement.h"
#include "EngineSystems/Render/ParticleService.h"
#include "GamePlaySystems/Json/ParticleDataManager.h"

namespace
{
	constexpr _uint DASH_CHARGE_PARTICLE_SETTING_ID = 1004;
	constexpr _double DASH_CHARGE_PARTICLE_INTERVAL = 0.06;
	constexpr _uint DASH_CHARGE_PARTICLE_COUNT = 4;
	constexpr _float DASH_CHARGE_OUTER_RING_MIN = 1.17f;
	constexpr _float DASH_CHARGE_OUTER_RING_MAX = 1.58f;
	constexpr _float DASH_CHARGE_INNER_TARGET_RATIO = 0.2f;
	constexpr _float DASH_CHARGE_PARTICLE_SCALE_MIN = 0.55f;
	constexpr _float DASH_CHARGE_PARTICLE_SCALE_MAX = 0.9f;
	constexpr _float DASH_CHARGE_PARTICLE_SPEED_MIN = 120.f;
	constexpr _float DASH_CHARGE_PARTICLE_SPEED_MAX = 220.f;
}

void DashAbility::OnInitialize(Enemy& _enemy)
{
	phase_ = DashPhase::None;
	charge_elapsed_ = 0.0;
	charge_emit_acc_ = 0.0;
	recovery_elapsed_ = 0.0;

	const auto* info = _enemy.GetEnemyInfo();
	if (nullptr == info)
		return;

	dash_speed_ = info->dash_speed_;
	dash_duration_ = info->dash_duration_;
	charge_duration_ = info->dash_charge_duration_;
	dash_cooldown_ = info->dash_cooldown_;
	recovery_duration_ = info->dash_recovery_duration_;
	charge_particle_setting_ = _ParticleDataMgr.GetData(DASH_CHARGE_PARTICLE_SETTING_ID);

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

	if (charge_duration_ > 0.0)
	{
		_StartCharging(_enemy);
		return;
	}

	_StartDash(_enemy);
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
	charge_elapsed_ = 0.0;
	charge_emit_acc_ = 0.0;
	recovery_elapsed_ = 0.0;
	dash_cooldown_acc_ = 0.0;
}

_bool DashAbility::ShouldSuppressHitState(const Enemy& _enemy) const
{
	(void)_enemy;
	return DashPhase::Charging == phase_;
}

_bool DashAbility::ShouldSuppressKnockback(const Enemy& _enemy) const
{
	(void)_enemy;
	return DashPhase::Charging == phase_;
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
	case DashPhase::Charging:
		_UpdateCharging(_enemy, _delta_time);
		break;

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

void DashAbility::_StartCharging(Enemy& _enemy)
{
	auto* movement = _enemy.GetMovement();
	if (nullptr == movement)
		return;

	movement->SetAllowNormalMove(false);
	movement->StopImmediately();
	movement->EndDash();

	phase_ = DashPhase::Charging;
	charge_elapsed_ = 0.0;
	charge_emit_acc_ = 0.0;
	recovery_elapsed_ = 0.0;

	auto* target = _enemy.GetPrimaryTarget();
	if (target)
	{
		_enemy.FaceTo(target->GetTransform()->Position());
	}
}

void DashAbility::_StartDash(Enemy& _enemy)
{
	auto* movement = _enemy.GetMovement();
	if (nullptr == movement)
		return;

	auto dash_dir = _enemy.GetTransform()->Forward2D().Normalized();
	auto* target = _enemy.GetPrimaryTarget();
	if (target)
	{
		const auto enemy_pos = _enemy.GetTransform()->Position();
		const auto target_pos = target->GetTransform()->Position();
		const auto to_target = target_pos - enemy_pos;
		if (to_target.LengthSq() > 0.f)
		{
			dash_dir = to_target.Normalized();
			_enemy.FaceTo(target_pos);
		}
	}

	if (dash_dir.LengthSq() <= 0.f)
	{
		_enemy.RequestChangeState(EnemyActionState::Move);
		return;
	}

	movement->SetAllowNormalMove(false);
	movement->StopImmediately();
	movement->StartDash(dash_dir, dash_speed_, dash_duration_);

	phase_ = DashPhase::Dashing;
	charge_elapsed_ = 0.0;
	charge_emit_acc_ = 0.0;
	recovery_elapsed_ = 0.0;
}

void DashAbility::_UpdateCharging(Enemy& _enemy, _double _delta_time)
{
	auto* target = _enemy.GetPrimaryTarget();
	if (nullptr == target)
	{
		_enemy.RequestChangeState(EnemyActionState::Move);
		return;
	}

	const auto target_pos = target->GetTransform()->Position();
	_enemy.FaceTo(target_pos);

	charge_elapsed_ += _delta_time;
	charge_emit_acc_ += _delta_time;

	while (charge_emit_acc_ >= DASH_CHARGE_PARTICLE_INTERVAL)
	{
		_EmitChargeParticleBurst(_enemy);
		charge_emit_acc_ -= DASH_CHARGE_PARTICLE_INTERVAL;
	}

	if (charge_elapsed_ >= charge_duration_)
	{
		_StartDash(_enemy);
	}
}

void DashAbility::_EmitChargeParticleBurst(Enemy& _enemy)
{
	if (nullptr == charge_particle_setting_)
		return;

	const auto* body_collider = _enemy.GetDefaultCollider(UnitDefaultColliderId::Body);
	if (nullptr == body_collider)
		return;

	const auto center = _Vector2(body_collider->GetCenter());
	const auto radius_x = std::max(1.f, body_collider->GetRadiusX());
	const auto radius_y = std::max(1.f, radius_x * std::max(0.1f, body_collider->GetYRatio()));

	for (_uint i = 0; i < DASH_CHARGE_PARTICLE_COUNT; ++i)
	{
		const auto angle_deg = _Random.Range(0.f, 360.f);
		const auto angle_rad = _MathFunc::ToRadian(angle_deg);
		const auto ring_scale = _Random.Range(DASH_CHARGE_OUTER_RING_MIN, DASH_CHARGE_OUTER_RING_MAX);

		const _Vector2 spawn_pos{
			center.x + cosf(angle_rad) * radius_x * ring_scale,
			center.y + sinf(angle_rad) * radius_y * ring_scale
		};

		const _Vector2 inward_target{
			center.x + _Random.Range(-radius_x * DASH_CHARGE_INNER_TARGET_RATIO, radius_x * DASH_CHARGE_INNER_TARGET_RATIO),
			center.y + _Random.Range(-radius_y * DASH_CHARGE_INNER_TARGET_RATIO, radius_y * DASH_CHARGE_INNER_TARGET_RATIO)
		};

		const auto travel = inward_target - spawn_pos;
		if (travel.LengthSq() <= 0.f)
			continue;

		const auto speed = _Random.Range(DASH_CHARGE_PARTICLE_SPEED_MIN, DASH_CHARGE_PARTICLE_SPEED_MAX);
		const auto velocity = travel.Normalized() * speed;
		const auto life_time = std::clamp(
			travel.Length() / std::max(1.f, speed),
			charge_particle_setting_->minLife,
			charge_particle_setting_->maxLife);
		const auto start_scale = charge_particle_setting_->startScale *
			_Random.Range(DASH_CHARGE_PARTICLE_SCALE_MIN, DASH_CHARGE_PARTICLE_SCALE_MAX);

		_ParticleService.EmitCustom(*charge_particle_setting_, spawn_pos, velocity, life_time, start_scale);
	}
}
