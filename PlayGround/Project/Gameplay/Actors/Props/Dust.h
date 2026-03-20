#pragma once
#include "Props.h"

class Dust final
	: public Props
	, public ICollidable
{
public:
	explicit Dust() = default;

private:
	_bool Initialize() override;
	_int Update(_double _delta_time) override;

	// ICollidable을(를) 통해 상속됨
	void OnCollisionEnter(Collider* _this, Collider* _other) override;

private:
	GameObjectBase* tracking_target_ = nullptr; // 트래킹할 게임 오브젝트에 대한 포인터. 필요에 따라 UI 요소가 특정 게임 오브젝트의 위치를 따라가도록 구현할 때 사용할 수 있습니다.
};

