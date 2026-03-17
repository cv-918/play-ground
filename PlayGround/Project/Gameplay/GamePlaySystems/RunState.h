#pragma once

#define _RunState RunState::Get()

class GameObjectBase;
class RunState final : public ISingleton<RunState>
{
public:
	void Reset()
	{
		player_ = nullptr;
		is_player_died_ = false;
		earned_coin_count_ = 0;
	}

	GameObjectBase* GetPlayer() const { return player_; }
	void SetPlayer(GameObjectBase* _player) { player_ = _player; }

	_bool IsPlayerDied() const { return is_player_died_; }
	void MarkAsPlayerDied() { is_player_died_ = true; }

	_uint GetEarnedCoinCount() const { return earned_coin_count_; }
	void IncreaseEarnedCoinCount(_uint _count) { earned_coin_count_ += _count; }

private:
	GameObjectBase* player_ = nullptr;
	_bool is_player_died_ = false; // 플레이어의 사망 여부를 나타내는 변수. 필요에 따라 게임 오버 처리나 결과 화면에서 활용할 수 있습니다.

	_uint earned_coin_count_ = 0; // 인게임 진입 후 획득한 코인 수를 나타내는 변수. 필요에 따라 인게임에서의 코인 획득과 소비를 관리하는 데 활용할 수 있습니다.
};

