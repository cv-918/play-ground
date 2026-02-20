#include "framework.h"
#include "Movement.h"

_bool Movement::Initialize()
{
	transform_ = s_cast(Transform*, gameobject_->GetComponent(ComponentType::Transform));
	
	if (!transform_)
		return false;

	return true;
}

_int Movement::Update(_double _delta_time)
{
	move_func_(_delta_time);
	return _int();
}

_int Movement::LateUpdate(_double _delta_time)
{
	return _int();
}
