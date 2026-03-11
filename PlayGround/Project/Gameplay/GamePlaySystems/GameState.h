#pragma once

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

class GameObjectBase;
class GameState
	: public ISingleton<GameState>
{
public:
	GameObjectBase* GetPlayer() const { return player_; }
	void SetPlayer(GameObjectBase* _player) { player_ = _player; }

	_bool GetPause() const { return pause_; }
	void SetPause(const _bool _pause);

	_uint GetCoinCount() const { return coin_count_; }
	void IncreaseCoinCount(_uint _count) { coin_count_ += _count; }

	_uint GetEarnedCoinCount() const { return earned_coin_count_; }
	void IncreaseEarnedCoinCount(_uint _count) { coin_count_ += _count; }

private:
	GameObjectBase* player_;

	_bool pause_ = false; // 게임 전체 일시정지 여부를 나타내는 플래그. 필요에 따라 게임 전체의 업데이트와 렌더링을 제어하는 데 활용할 수 있습니다.

	// 코인 획득 기능 개발을 위해 우선 여기에서 선언. 추후에 코인 시스템이 완성되면 이 부분은 코인 시스템으로 이동하거나, 게임 상태와 코인 시스템이 서로 참조할 수 있도록 구조를 개선할 수 있습니다.
	_uint coin_count_ = 0; // 플레이어가 획득한 코인 수를 나타내는 변수. 필요에 따라 게임 내에서 코인 획득과 소비를 관리하는 데 활용할 수 있습니다.
	_uint earned_coin_count_ = 0; // 인게임 진입 후 획득한 코인 수를 나타내는 변수. 필요에 따라 인게임에서의 코인 획득과 소비를 관리하는 데 활용할 수 있습니다.

	/* 테스트 전용 함수 및 변수들 */
public:
	_bool MonsterPause() const { return monster_pause_; }
	void MonsterPause(const _bool _pause) { monster_pause_ = _pause; }

private:
	_bool monster_pause_ = false; // 몬스터 일시정지 여부를 나타내는 플래그. 필요에 따라 몬스터의 업데이트와 행동을 제어하는 데 활용할 수 있습니다.

public:
	_bool debug_mode_ = false; // 디버그 모드 여부를 나타내는 플래그. 필요에 따라 게임의 디버그 기능을 활성화하거나 비활성화하는 데 활용할 수 있습니다.
};

