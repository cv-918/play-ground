#include "framework.h"
#include "Unit.h"

Unit::Unit()
	: movement_(nullptr), combat_(nullptr), status_(nullptr)
{
}

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
	combat_ = new Combat();
	RegisterComponent(combat_);
	status_ = new Status();
	RegisterComponent(status_);

	return _bool();
}
