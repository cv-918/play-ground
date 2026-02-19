#pragma once
#include "Movement.h"
#include "Systems/Input/InputManager.h"

class PlayerMovement final : public Movement
{
public:
	explicit PlayerMovement();
	virtual ~PlayerMovement() DEFAULT;

public:
	virtual _bool Initialize() override;

private:
	void _ProcessOnPlayerControl(_double _delta_time);

private:
	const InputManager* input_manager_; // 매 프레임 Get 호출 방지용 InputManager 캐싱
	KeyBoardControlType controller_type_;

	class Transform* transform_;
};

