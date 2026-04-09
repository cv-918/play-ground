#pragma once
#include "../UIBase.h"

enum class ButtonState
{
	Normal,
	Hovered,
	Pressed_L,
    Pressed_R,
	Disabled
};

class Button final : public UIBase
{
public:
	struct CreateInfo : public UIBase::UICreateInfo
	{
		std::wstring text;
		std::wstring image_path;
		std::function<void()> on_lclick;
		std::function<void()> on_rclick;
	};

public:
	explicit Button(const CreateInfo& _info);

public:
	_int Update(_double _delta_time) override;
	void Render(_double _delta_time) override;

	// 버튼 텍스트 설정
	void SetText(const std::wstring& _text) { text_ = _text; }

	// 버튼 클릭 시 호출될 콜백 함수 설정
	void SetOnLClick(const std::function<void()>& _callback) { on_lclick_ = _callback; }
	void SetOnRClick(const std::function<void()>& _callback) { on_rclick_ = _callback; }

	// 버튼에 세팅된 콜백 실행 (예: 외부에서 강제로 클릭 이벤트 발생시키고 싶을 때)
	void LClick() { if (on_lclick_) on_lclick_(); }
	void RClick() { if (on_rclick_) on_rclick_(); }

private:
	const SpriteResource* sprite_ = nullptr;
	std::wstring text_; // 버튼에 표시될 텍스트
	std::function<void()> on_lclick_; // 버튼 좌클릭 시 호출될 콜백 함수
	std::function<void()> on_rclick_; // 버튼 우클릭 시 호출될 콜백 함수

	ButtonState state_ = ButtonState::Normal; // 버튼의 현재 상태
};

