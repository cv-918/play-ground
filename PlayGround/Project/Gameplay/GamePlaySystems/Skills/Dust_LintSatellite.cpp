#include "framework.h"
#include "Dust_LintSatellite.h"
#include "LintSatelliteObject.h"

_bool Dust_LintSatellite::Execute(GameObjectBase* _owner, const _Vector3& _direction)
{
	if (nullptr == _owner)
	{
		_NULL_DETECTION_MSGBOX;
		return false;
	}

	// 1) 소환할 개수 파악
	_int count = info_->proj_count_;
	if (count <= 0)
	{
		_SYSTEM_LOG_ERROR(L"Invalid projectile count (%d) for skill ID %d", count, info_->id_);
		return false;
	}

	// 2. 각 위성간의 간격 계산 (360도 / 개수)
	_float angle_step = 360.f / s_float(count);

	UnitCreationInfo c_info;
	c_info.owner_ = _owner;
	c_info.position_ = _owner->GetTransform()->Position();

	// 3. 오브젝트 생성 및 씬에 등록
	for (_int i = 0; i < count; ++i)
	{
		// 중요: look_point_.x에 시작 각도(Degree)를 임시로 담아서 전달
		// Object의 Initialize에서 이를 받아 초기 위치를 잡음
		c_info.look_point_ = _Vector3(angle_step * i, 0.f, 0.f);
		_RunState.GetInGameScene()->GetObjectManager()->CreateActor<LintSatelliteObject>(info_, c_info);
	}

	// 4. 쿨타임 리셋
	_ResetCoolTime();
	return true;
}
