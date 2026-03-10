#include "framework.h"
#include "UnitBase.h"

#include "Components/Movement.h"

_bool Unit::Initialize()
{
	if (!__super::Initialize())
		return false;

	// 디폴트 콜라이더가 아직 등록되지 않았다면 생성해서 등록
	if (default_colliders_.empty())
	{
		// 기본 콜라이더 생성 및 등록
		for (int i = 0; i < s_int(UnitDefaultColliderId::ColCount); ++i)
		{
			auto* collider = new SphereCollider(0.f); // 초기 반지름은 0으로 설정, 필요에 따라 조정
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

void Unit::SetNavMesh(const _Rect& _rt)
{
	if (movement_)
		movement_->SetNavMesh(_rt);
}
