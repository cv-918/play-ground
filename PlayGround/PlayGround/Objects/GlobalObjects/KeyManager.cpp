#include "KeyManager.h"

void KeyManager::BeginFrame()
{
	// 프레임 트리거(눌림/뗌) 초기화
	for (auto& k : keys_)
	{
		k.went_down = false;
		k.went_up = false;
	}

	// 이번 프레임 문자 입력 버퍼 초기화
	chars_.clear();
}

void KeyManager::OnKeyDown(WPARAM _vk, LPARAM _lparam)
{
	if (_vk > 255) return;

	// lParam bit 30: 이전 키 상태(1이면 이전에도 눌려있던 상태 -> 자동 반복 포함)
	const bool was_down = (_lparam & (1LL << 30)) != 0;

	auto& k = keys_[static_cast<uint8_t>(_vk)];

	// 물리적으로 "처음 눌림"만 Down 트리거로 처리
	if (!k.is_down)
	{
		k.is_down = true;
		k.went_down = true;
		return;
	}

	// 이미 눌린 상태에서 들어오는 반복 입력은 보통 무시한다.
	// 텍스트 입력은 WM_CHAR가 담당하므로, 필요하면 was_down 값을 이용해 별도 처리 가능.
	(void)was_down;
}

void KeyManager::OnKeyUp(WPARAM _vk, LPARAM _lparam)
{
	if (_vk > 255) return;

	auto& k = keys_[static_cast<uint8_t>(_vk)];
	if (k.is_down)
	{
		k.is_down = false;
		k.went_up = true;
	}
}

void KeyManager::OnChar(_tchar _ch)
{
	// WM_CHAR로 들어온 문자를 프레임 단위로 누적
	chars_.push_back(_ch);
}

bool KeyManager::Down(_int _vk) const
{
	if (_vk < 0 || _vk > 255) return false;
	return keys_[static_cast<uint8_t>(_vk)].went_down;
}

bool KeyManager::Pressed(_int _vk) const
{
	if (_vk < 0 || _vk > 255) return false;
	return keys_[static_cast<uint8_t>(_vk)].is_down;
}

bool KeyManager::Up(_int _vk) const
{
	if (_vk < 0 || _vk > 255) return false;
	return keys_[static_cast<uint8_t>(_vk)].went_up;
}

const std::vector<_tchar>& KeyManager::Chars() const
{
	return chars_;
}

void KeyManager::ResetAll()
{
	// 모든 키 상태 초기화(눌림 고정 방지)
	std::fill(keys_.begin(), keys_.end(), KeyState{});

	// 문자 입력 버퍼도 초기화
	chars_.clear();
}
