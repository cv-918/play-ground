#include "framework.h"
#include "Dust_DustGust.h"

#include "DustGustObject.h"

_bool Dust_DustGust::Execute(GameObjectBase* _owner, const _Vector3& _direction)
{
	// 1. 발사 위치 확보 (플레이어 위치)
	_Vector3 spawn_pos = _owner->GetTransform()->Position();

	// 2. 투사체(실제 날아가는 객체) 생성 요청
	UnitCreationInfo c_info;
	c_info.position_ = spawn_pos;
	c_info.look_point_ = spawn_pos + _direction * 2.f;

	// DustProjectile은 별도의 GameObject 상속 클래스입니다.
	// 여기서 info_를 넘겨주어 투사체가 자신의 속도/데미지를 알게 합니다.
	if (auto proj = _RunState.GetInGameScene()->GetObjectManager()->CreateActor<DustGustObject>(info_, c_info))
	{
		_ResetCoolTime(); // 발사 성공했으므로 쿨타임 시작
		return true;
	}

	return false;
}
