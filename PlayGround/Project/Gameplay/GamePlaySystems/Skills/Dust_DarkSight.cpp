#include "framework.h"
#include "Dust_DarkSight.h"

#include "DarkSightObject.h"

_bool Dust_DarkSight::Execute(GameObjectBase* _owner, const _Vector3& _direction)
{
	// 1) 생성 위치
	_Vector3 spawn_pos = _owner->GetTransform()->Position();

	// 2) 객체 생성 요청
	UnitCreationInfo c_info;
	c_info.position_ = spawn_pos;

	if (auto object = _RunState.GetInGameScene()->GetObjectManager()->CreateActor<DarkSightObject>(info_, c_info, _owner))
	{
		_ResetCoolTime(); // 생성 성공했으므로 쿨타임 시작
		return true;
	}

	return false;
}
