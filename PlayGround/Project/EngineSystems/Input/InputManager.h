#pragma once

#define _InputMgr InputManager::Get()
#define INPUT_KEY_MAX 256

enum class KeyBoardControlType
{
	Direction,
	Axis,
};

class InputManager : public ISingleton<InputManager>
{
public:
	/* 매 프레임 시작 시 1회 메시지 처리 전에 호출 */
	void BeginFrame();

	// 포커스 잃었을 때(Alt+Tab 등) 키가 눌린 채로 고정되는 현상 방지용
	void ResetAll();

	/* WndProc에서 호출 */
	void OnMouseMove(WPARAM _wparam, LPARAM _lparam);
	void OnMouseWheel(WPARAM _wparam, LPARAM _lparam);

	void OnMouseButtonDown(WPARAM _vk, LPARAM _lparam);
	void OnMouseButtonUp(WPARAM _vk, LPARAM _lparam);

	void OnKeyDown(WPARAM _vk, LPARAM _lparam);
	void OnKeyUp(WPARAM _vk, LPARAM _lparam);

	void OnChar(_tchar _ch);

	/* 입력 상태 조회 */
	bool Down(_int _vk) const;
	bool Pressed(_int _vk) const;
	bool Up(_int _vk) const;

	_bool AnyKeyPressed() const { return pressed_key_count_ > 0; }

	_Point MousePoint() const { return mouse_; }
	_Point MouseDelta() const { return mouse_delta_; }
	_int WheelDelta() const { return wheel_delta_; } // ±120 단위가 일반적

	const std::vector<_tchar>& Chars() const { return chars_; } // 이번 프레임에 들어온 WM_CHAR 문자 목록
	
	KeyBoardControlType ControllerType() const { return keyboard_control_type_; }
	void ControllerType(const KeyBoardControlType _type) { keyboard_control_type_ = _type; }

private:
	struct KeyState
	{
		_bool is_down = false;    // 현재 눌림 상태(물리 상태)
		_bool went_down = false;  // 이번 프레임에 눌림(에지)
		_bool went_up = false;    // 이번 프레임에 뗌(에지)
	};

	std::array<KeyState, INPUT_KEY_MAX> keys_;
	std::vector<_tchar> chars_;

	_int pressed_key_count_ = IV_ZERO;

	_Point mouse_ = _Point::Zero();
	_Point prev_mouse_ = _Point::Zero();
	_Point mouse_delta_ = _Point::Zero();

	_int wheel_delta_ = IV_ZERO;

	KeyBoardControlType keyboard_control_type_ = KeyBoardControlType::Axis;
};
