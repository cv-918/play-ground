#pragma once
#include "SkillObjectBase.h"

class DarkSightObject final : public SkillObjectBase
{
public:
	explicit DarkSightObject(const SkillJsonInfo* _info, const UnitCreationInfo& _c_info, GameObjectBase* _owner)
		: SkillObjectBase(_info, _c_info), owner_(_owner) {}

public:
	_bool Initialize() override;

private:
	_int LateUpdate(_double _delta_time) override;
	void OnDestroy() override;

private:
	_double life_timer_ = 0.0;

	GameObjectBase* owner_ = nullptr; // 이 객체를 생성한 주체(플레이어)를 참조하는 포인터. 필요에 따라 스킬 효과가 적용되는 대상이나 스킬의 지속 시간 관리 등에 활용할 수 있습니다.
	class Status* owner_status_ = nullptr; // 주체의 상태를 관리하는 컴포넌트에 대한 포인터. 필요에 따라 스킬 효과가 적용되는 대상의 상태를 변경하거나, 스킬 효과가 끝난 후 상태를 원상 복구하는 로직에서 활용할 수 있습니다.
	class Movement* owner_movement_ = nullptr; // 주체의 이동을 관리하는 컴포넌트에 대한 포인터. 필요에 따라 스킬 효과가 적용되는 대상의 이동 속도를 변경하거나, 스킬 효과가 끝난 후 이동 속도를 원상 복구하는 로직에서 활용할 수 있습니다.
	_float original_move_spd_max_ = 0.f; // 이동 속도 원상 복구용 변수. 필요에 따라 스킬 효과가 끝난 후 플레이어의 이동 속도를 원래대로 되돌리는 로직에서 활용할 수 있습니다.
};

