#pragma once
#include "Core/Base/Bases.h"

/*
	Dynamic Info.
	플레이가 시작된 순간부터 실시간으로 변하는 정보들
*/

#define _GameState GameState::Get()

enum class GAME_PLAY_STATE
{
	EnteringLobby,
	Lobby,
	ExitingLobby,

	EnteringInGame,
	InGame,
	ExitingInGame,
};

class GameObject;
class GameState
	: public SingletonBase<GameState>
{
public:
	GameObject* Player() const { return player_; }
	void Player(GameObject* _player) { player_ = _player; }

private:
	GameObject* player_;
};

