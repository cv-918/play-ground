#pragma once
#include "Movement.h"

// NonPlayableMovement 에서 제공할 이동 방식에 대한걸 번들로 묶어서 설정 및 초기화할 수도 있음
class GameObjectBase;
class NonPlayableMovement final : public Movement
{
public:
	~NonPlayableMovement() override;
	_bool Initialize() override;

private:
	void _ProcessOnDirectional(_double _delta_time);
	void _ProcessOnToTarget(_double _delta_time);
	void _HandleTargetDestroyed();
	void _DetachTarget();

public:
	void Target(GameObjectBase* _object);

private:
	GameObjectBase* target_ = nullptr;
	IDestroyable::DestructionCallbackId target_callback_id_ = IDestroyable::kInvalidDestructionCallbackId;
};
