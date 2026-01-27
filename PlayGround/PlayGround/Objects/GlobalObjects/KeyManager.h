#pragma once

#include "../../../GlobalHeaders/GlobalHeader.h"
#define _KeyMgr KeyManager::Get()

class KeyManager : public SingletonBase<KeyManager>
{
public:
	// 매 프레임 시작 시 1회 호출(Update 전에 호출)
	void BeginFrame();

	// WndProc에서 호출
	void OnKeyDown(WPARAM _vk, LPARAM _lparam); // store key down state
	void OnKeyUp(WPARAM _vk, LPARAM _lparam);	// store key up state
	void OnChar(_tchar _ch);

	// 키 상태 조회
	bool Down(_int _vk) const;     // 이번 프레임에 눌림
	bool Pressed(_int _vk) const;  // 누르고 있음
	bool Up(_int _vk) const;       // 이번 프레임에 뗌

	// 이번 프레임에 들어온 WM_CHAR 문자 목록
	const std::vector<_tchar>& Chars() const;

	// 포커스 잃었을 때(Alt+Tab 등) 키가 눌린 채로 고정되는 현상 방지용
	void ResetAll();

private:
	struct KeyState
	{
		_bool is_down = false;    // 현재 눌림 상태(물리 상태)
		_bool went_down = false;  // 이번 프레임에 눌림(에지)
		_bool went_up = false;    // 이번 프레임에 뗌(에지)
	};

	std::array<KeyState, 256> keys_;
	std::vector<_tchar> chars_;
};

