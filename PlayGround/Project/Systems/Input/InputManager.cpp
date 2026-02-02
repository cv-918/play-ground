#include "framework.h"
#include "InputManager.h"

#include <windowsx.h>

void InputManager::BeginFrame()
{
	// 프레임 트리거(눌림/뗌) 초기화
	for (auto& k : keys_)
	{
		k.went_down = false;
		k.went_up = false;
	}

	// 이번 프레임 문자 입력 버퍼 초기화
	chars_.clear();

	wheel_delta_ = 0;
	mouse_delta_.x = 0;
	mouse_delta_.y = 0;
	prev_mouse_ = mouse_;
}

void InputManager::ResetAll()
{
	// 모든 키 상태 초기화(눌림 고정 방지)
	std::fill(keys_.begin(), keys_.end(), KeyState{});

	// 눌린 키 카운트도 초기화
	pressed_key_count_ = IV_ZERO;

	// 문자 입력 버퍼도 초기화
	chars_.clear();
}

void InputManager::OnMouseMove(WPARAM _wparam, LPARAM _lparam)
{
	mouse_.x = GET_X_LPARAM(_lparam);
	mouse_.y = GET_Y_LPARAM(_lparam);

	// 프레임 내 누적 델타(움직임이 여러 번 오면 누적됨)
	mouse_delta_.x += (mouse_.x - prev_mouse_.x);
	mouse_delta_.y += (mouse_.y - prev_mouse_.y);

	(void)_wparam;
}

void InputManager::OnMouseWheel(WPARAM _wparam, LPARAM _lparam)
{
	// 보통 ±120 단위로 들어옴(휠 한 칸)
	wheel_delta_ += GET_WHEEL_DELTA_WPARAM(_wparam);

	(void)_lparam;
}

void InputManager::OnMouseButtonDown(WPARAM _vk, LPARAM _lparam)
{
	OnKeyDown(_vk, _lparam);
}

void InputManager::OnMouseButtonUp(WPARAM _vk, LPARAM _lparam)
{
	OnKeyUp(_vk, _lparam);
}

void InputManager::OnKeyDown(WPARAM _vk, LPARAM _lparam)
{
	if (_vk > UCHAR_MAX) return;

	// lParam bit 30: 이전 키 상태(1이면 이전에도 눌려있던 상태 -> 자동 반복 포함)
	const bool was_down = (_lparam & (1LL << 30)) != 0;

	auto& k = keys_[s_cast(uint8_t, _vk)];

	// 물리적으로 "처음 눌림"만 Down 트리거로 처리
	if (!k.is_down)
	{
		k.is_down = true;
		k.went_down = true;

		++pressed_key_count_;
		return;
	}

	// 이미 눌린 상태에서 들어오는 반복 입력은 보통 무시한다.
	// 텍스트 입력은 WM_CHAR가 담당하므로, 필요하면 was_down 값을 이용해 별도 처리 가능.
	(void)was_down;
}

void InputManager::OnKeyUp(WPARAM _vk, LPARAM _lparam)
{
	if (_vk > UCHAR_MAX) return;

	auto& k = keys_[s_cast(uint8_t, _vk)];
	if (k.is_down)
	{
		k.is_down = false;
		k.went_up = true;

		if (pressed_key_count_ > 0)
			--pressed_key_count_;
	}
}

void InputManager::OnChar(_tchar _ch)
{
	// WM_CHAR로 들어온 문자를 프레임 단위로 누적
	chars_.push_back(_ch);
}

bool InputManager::Down(_int _vk) const
{
	if (_vk < 0 || _vk > UCHAR_MAX) return false;
	return keys_[s_cast(uint8_t, _vk)].went_down;
}

bool InputManager::Pressed(_int _vk) const
{
	if (_vk < 0 || _vk > UCHAR_MAX) return false;
	return keys_[s_cast(uint8_t, _vk)].is_down;
}

bool InputManager::Up(_int _vk) const
{
	if (_vk < 0 || _vk > UCHAR_MAX) return false;
	return keys_[s_cast(uint8_t, _vk)].went_up;
}
