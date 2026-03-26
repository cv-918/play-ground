#pragma once

/*
	Dynamic Info.
	플레이가 시작된 순간부터 실시간으로 변하는 정보들
*/

#define _GameState GameState::Get()

class InGameScene;

class GameState final : public ISingleton<GameState>
{
public:
	_bool GetPause() const { return pause_; }
	void SetPause(const _bool _pause);

private:
	_bool pause_ = false; // 게임 전체 일시정지 여부를 나타내는 플래그. 필요에 따라 게임 전체의 업데이트와 렌더링을 제어하는 데 활용할 수 있습니다.

public:
	_bool debug_mode_ = false; // 디버그 모드 여부를 나타내는 플래그. 필요에 따라 게임의 디버그 기능을 활성화하거나 비활성화하는 데 활용할 수 있습니다.
};
