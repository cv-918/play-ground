#pragma once
#include "Props.h"

class Dust final
	: public Props
	, public ICollidable
{
public:
	explicit Dust(const UnitCreationInfo& _creation_info, _float _spd, _uint _dust_amount)
		: Props(PropsType::Dust, _creation_info), move_spd_(_spd), dust_amount_(_dust_amount) {}

public:
	_bool Initialize() override;
	_int Update(_double _delta_time) override;
	void Render(_double _delta_time) override;

	void OnDestroy() override;

	// ICollidable을(를) 통해 상속됨
	void OnCollisionEnter(Collider* _this, Collider* _other) override;

private:
	_float move_spd_ = 0.f;
	_uint dust_amount_ = 0; // 먼지의 양을 나타내는 변수. 필요에 따라 플레이어가 먼지를 수집할 때 이 값을 활용하여 플레이어의 자원이나 점수를 증가시키는 로직에서 사용할 수 있습니다.

	class SphereCollider* collider_ = nullptr; // 먼지의 충돌 영역을 나타내는 SphereCollider 컴포넌트에 대한 포인터. 필요에 따라 충돌 감지 및 처리 로직에서 활용할 수 있습니다.

	Transform* tracking_transform_ = nullptr; // 트래킹 대상의 Transform 컴포넌트에 대한 포인터. 필요에 따라 트래킹 대상의 위치, 회전, 크기를 실시간으로 업데이트하여 UI 요소가 해당 대상과 일치하도록 구현할 때 사용할 수 있습니다.
	_double tracking_time_ = 0.0; // 트래킹이 시작된 시점부터의 누적 시간. 필요에 따라 트래킹 대상과의 거리 계산, 트래킹 지속 시간 제한, 트래킹 효과의 점진적 변화 등을 구현할 때 활용할 수 있습니다.
};

