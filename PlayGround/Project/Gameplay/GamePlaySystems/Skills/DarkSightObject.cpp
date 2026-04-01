#include "framework.h"
#include "DarkSightObject.h"

#include "Components/Status.h"
#include "Components/Movement.h"

_bool DarkSightObject::Initialize()
{
	if (!__super::Initialize())
		return false;

	transform_->Position(creation_info_.position_);
	transform_->Scale(skill_info_->area_of_effect_);

	color_ = Palette::Gunmetal;
	SetAlpha(0.5f);

	life_timer_ = skill_info_->duration_;

	owner_->SetAlpha(0.5f); // 투명도 50%로 설정

	owner_status_ = s_cast(Status*, owner_->GetComponent(ComponentType::Status));
	owner_status_->SetInvincible(true); // 무적 상태로 설정

	owner_movement_ = s_cast(Movement*, owner_->GetComponent(ComponentType::Movement));
	original_move_spd_max_ = owner_movement_->GetMoveSpdMax();
	owner_movement_->SetMoveSpdMax(original_move_spd_max_ * 1.5f); // 이동 속도 50% 증가
	owner_movement_->SetAsMaxSpeed(); // 즉시 최대 이동 속도로 설정

	Finalize();
	return true;
}

_int DarkSightObject::LateUpdate(_double _delta_time)
{
	auto ret = __super::LateUpdate(_delta_time);
	if (UPDATE_CONTINUE != ret)
		return ret;

	// 스킬 오브젝트가 플레이어를 따라다니도록 위치를 지속적으로 업데이트
	const auto owner_pos = owner_->GetTransform()->Position();
	transform_->Position(owner_pos);

	life_timer_ -= _delta_time;
	if (life_timer_ <= 0.0)
	{
		ReserveDestruction();
		return UPDATE_BREAK;
	}

	return UPDATE_CONTINUE;
}

void DarkSightObject::OnDestroy()
{
	__super::OnDestroy();

	// 1) 이동속도 원상 복구
	owner_movement_->SetMoveSpdMax(original_move_spd_max_);

	// 2) 무적 상태 해제
	owner_status_->SetInvincible(false);
	
	// 3) 투명도 원상 복구
	owner_->SetAlpha(1.f); // 완전히 불투명하게 설정
}
