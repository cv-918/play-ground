#pragma once
#include "Movement.h"

// NonPlayableMovement 에서 제공할 이동 방식에 대한걸 번들로 묶어서 설정 및 초기화할 수도 있음
class NonPlayableMovement final : public Movement
{
public:
	virtual _bool Initialize() override;

private:
	void _ProcessOnstopped(_double _delta_time);
	void _ProcessOnDirectional(_double _delta_time);
	void _ProcessOnToTarget(_double _delta_time);

public:
	void Target(class GameObject* _object) { target_ = _object; }

private:
	class GameObject* target_;
};
