#pragma once
#include "UIBase.h"

enum class ButtonState
{
	Normal,
	Hovered,
	Pressed,
	Disabled
};

class UIButton final : public UIBase
{
public:
	explicit UIButton() DEFAULT;
	virtual ~UIButton() DEFAULT;

public:
	_int Update(_double _delta_time) override;
	void Render(_double _delta_time) override;

	// 버튼 텍스트 설정
	void SetText(const std::wstring& _text) { text_ = _text; }

	// 버튼 클릭 시 호출될 콜백 함수 설정
	void SetOnClick(const std::function<void()>& _callback) { on_click_ = _callback; }

private:
	std::wstring text_; // 버튼에 표시될 텍스트
	std::function<void()> on_click_; // 버튼 클릭 시 호출될 콜백 함수

	ButtonState state_ = ButtonState::Normal; // 버튼의 현재 상태
};

