#pragma once
#include "Movement.h"

enum class PlayerMovementType
{
	Undefined,
	Town,
	Direction,
	Axis,
};

class PlayerMovement final : public Movement
{
public:
	explicit PlayerMovement(const PlayableCharacterJsonInfo* _info);
	virtual ~PlayerMovement() DEFAULT;

public:
	_bool Initialize() override;

public:
	void SetControllerType(const PlayerMovementType _type) { controller_type_ = _type; }
	void SetGameplayInputBlocked(_bool _blocked);

private:
	void _ProcessOnPlayerControl(_double _delta_time);
	void _OnImmediate(_double _delta_time);
	void _OnDirection(_double _delta_time);
	void _OnAxis(_double _delta_time);

private:
	InputManager* input_manager_ = nullptr; // 매 프레임 Get 호출 방지용 InputManager 캐싱
	PlayerMovementType controller_type_ = PlayerMovementType::Axis;
	_bool gameplay_input_blocked_ = false;
};
