#pragma once

#include "Unit.h"

enum class ControllerType
{
	Direction, // w : 앞으로 이동
	Axis, // w : 위로 이동
};

class Player : public Unit
{
private:
	virtual bool Initialize() override;
	virtual _int Update(_double _delta_time) override;
	virtual _int Render(_double _delta_time) override;

private:
	_int _ControllRoutine(_double _delta_time);

public:
	void SetControllerType(const ControllerType _type) { controller_type_ = _type; }
	
private:
	ControllerType controller_type_ = ControllerType::Axis;
};

