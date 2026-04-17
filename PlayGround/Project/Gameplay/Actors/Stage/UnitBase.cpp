#include "framework.h"
#include "UnitBase.h"

#include "EngineSystems/Render/CameraManager.h"
#include "Components/Movement.h"
#include "Common/HitReaction.h"

namespace
{
	constexpr _double UNIT_HIT_FLASH_DURATION = 0.18;
	constexpr _double UNIT_HIT_FLASH_BLINK_INTERVAL = 0.045;
}

_bool UnitBase::Initialize()
{
	if (!__super::Initialize())
		return false;

	// 디폴트 콜라이더가 아직 등록되지 않았다면 생성해서 등록
	if (default_colliders_.empty())
	{
		// 기본 콜라이더 생성 및 등록
		for (int i = 0; i < s_int(UnitDefaultColliderId::ColCount); ++i)
		{
			auto* collider = new EllipseCollider(); // 초기 반지름은 0으로 설정, 필요에 따라 조정
			RegisterComponent(collider);
			default_colliders_.push_back(collider);
		}
	}

	// 컴뱃 컴포넌트와 스테이터스 컴포넌트 생성 및 등록
	status_ = new Status();
	RegisterComponent(status_);
	combat_ = new Combat(status_); // Combat 컴포넌트는 Status 컴포넌트를 필요로 하므로, Status 컴포넌트를 먼저 생성하고 전달
	RegisterComponent(combat_);

	return true;
}

void UnitBase::ApplyHitReaction(const HitContext& _hit, _bool _victim_is_player)
{
	const _float victim_max_hp = status_ ? status_->GetMaxHP() : 0.f;
	const _bool is_fatal_hit = status_ && status_->IsDead() && last_received_damage_ > 0.f;

	const auto resolved = ResolveHitReaction(
		_hit.reaction_,
		last_received_damage_,
		victim_max_hp,
		_hit.is_dash_attack_,
		is_fatal_hit,
		_victim_is_player,
		1.f);

	if (movement_ && resolved.knockback_distance_world_px_ > 0.f && resolved.knockback_duration_sec_ > 0.f)
	{
		movement_->StartKnockback(
			_hit.knockback_direction_,
			resolved.knockback_distance_world_px_,
			resolved.knockback_duration_sec_,
			_hit.reaction_.knockback_curve_);
	}

	if (resolved.trauma_gain_ > 0.f)
	{
		_CameraMgr.AddTrauma(resolved.trauma_gain_);
	}
}

void UnitBase::StartHitFlash()
{
	hit_flash_timer_ = UNIT_HIT_FLASH_DURATION;
}

void UnitBase::UpdateHitFlash(_double _delta_time)
{
	if (0.0 < hit_flash_timer_)
		hit_flash_timer_ = std::max(0.0, hit_flash_timer_ - _delta_time);
}

_bool UnitBase::IsHitFlashing() const
{
	return 0.0 < hit_flash_timer_;
}

_float UnitBase::GetHitFlashStrength() const
{
	if (!IsHitFlashing())
		return 0.0f;

	const auto elapsed = UNIT_HIT_FLASH_DURATION - hit_flash_timer_;
	const auto blink_index = s_int(elapsed / UNIT_HIT_FLASH_BLINK_INTERVAL);
	const auto blink_strength = (0 == (blink_index % 2)) ? 1.0f : 0.35f;
	const auto fade_out = s_float(hit_flash_timer_ / UNIT_HIT_FLASH_DURATION);
	return std::clamp(blink_strength * fade_out, 0.0f, 1.0f);
}

void UnitBase::SetNavMesh(const _Rect& _rt)
{
	if (movement_)
		movement_->SetNavMesh(_rt);
}
