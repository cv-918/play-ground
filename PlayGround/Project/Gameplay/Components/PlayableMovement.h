#pragma once
#include "Movement.h"

class PlayableMovement final : public Movement
{
public:
	explicit PlayableMovement(const PlayableCharacterJsonInfo* _info);
	virtual ~PlayableMovement() DEFAULT;

public:
	_bool Initialize() override;

	

private:
	void _ProcessOnPlayerControl(_double _delta_time);
	void _OnDirection(_double _delta_time);
	void _OnAxis(_double _delta_time);

private:
	const InputManager* input_manager_ = nullptr; // 매 프레임 Get 호출 방지용 InputManager 캐싱
	KeyBoardControlType controller_type_;

	class Player* player_ = nullptr; // 플레이어 캐싱용 포인터. 필요에 따라 플레이어 관련 로직에서 활용할 수 있습니다.
};