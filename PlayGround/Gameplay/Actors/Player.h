#pragma once

#include "Actors/Unit.h"

enum class KeyBoardControlType
{
	Direction,
	Axis,
};

enum class MouseControlType
{
	// 마우스 방향으로 look at 하고 이동하는 로직을 사용할 경우 여기에 추가
};

// 아니면 둘 다 합쳐서 그냥 컨트롤 타입으로 묶고 그 안에서 제한적으로 제공
// 이게 사실 정석인 것 같긴 하다

class Player : public Unit
{
private:
	virtual _bool Initialize() override;
	virtual _int Update(_double _delta_time) override;
	virtual _int Render(_double _delta_time) override;

private:
	_int _ControllRoutine(_double _delta_time);

public:
	void SetControllerType(const KeyBoardControlType _type) { controller_type_ = _type; }
	
private:
	KeyBoardControlType controller_type_ = KeyBoardControlType::Axis;
};

