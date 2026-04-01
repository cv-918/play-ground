#pragma once
#include "WidgetBase.h"

class ProgressBar;
class GameObjectBase;
class Transform;
class Status;

class HpBar final : public WidgetBase
{
public:
	explicit HpBar(GameObjectBase* _target, const _Vector3& _offset);

private:
	_int Update(_double _delta_time) override;
	_int LateUpdate(_double _delta_time) override;
	void Render(_double _delta_time) override;

public:
	// 체력바가 나타난 후 일정 시간이 지나면 사라지도록 구현. _duration은 체력바가 완전히 사라지는 데 걸리는 시간(초)
	void Appear(_double _duration = DEFAULT_DURATION_HP_BAR);

private:
	ProgressBar* hp_bar_ = nullptr;

	_float current_hp_ = 0.f; // 현재 체력. 필요에 따라 체력바의 채워진 정도를 계산할 때 활용할 수 있습니다.

	_double life_time_timer_ = DEFAULT_DURATION_HP_BAR + 1.0; // 체력바가 나타난 후 경과한 시간. 이 값이 0이 되면 체력바가 완전히 사라진 것으로 간주.

	GameObjectBase* tracking_target_ = nullptr; // 트래킹할 게임 오브젝트에 대한 포인터. 필요에 따라 UI 요소가 특정 게임 오브젝트의 위치를 따라가도록 구현할 때 사용할 수 있습니다.
	Transform* tracking_transform_ = nullptr; // 트래킹 대상의 Transform 컴포넌트에 대한 포인터. 필요에 따라 UI 요소가 트래킹하는 게임 오브젝트의 위치, 회전, 크기 등의 정보를 활용할 때 사용할 수 있습니다.
	Status* tracking_status_ = nullptr; // 트래킹 대상의 상태 정보를 저장하는 포인터. 필요에 따라 UI 요소가 트래킹하는 게임 오브젝트의 상태에 따라 UI를 업데이트할 때 활용할 수 있습니다.
	_Vector3 tracking_offset_ = _Vector3::Zero(); // 트래킹 오프셋. 필요에 따라 UI 요소가 트래킹하는 게임 오브젝트에 대해 위치 보정을 할 때 활용할 수 있습니다.
};

