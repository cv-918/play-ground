#pragma once
#include "UIBase.h"

class UIText final : public UIBase
{
public:
	explicit UIText() : color_(Colors::Black), fontSize_(12.f), isCenter_(true), lifeTime_(-1.f) {}
	virtual ~UIText() DEFAULT;

	_int Update(_double _delta_time) override;
	void Render(_double _delta_time) override;

	// 설정 함수들
	void SetText(const std::wstring& _text) { text_ = _text; }
	void SetColor(const _Color& _color) { color_ = _color; }
	void SetFontSize(_float _size) { fontSize_ = _size; }
	void SetLifeTime(_float _duration) { lifeTime_ = _duration; } // -1이면 영구 지속

private:
	std::wstring text_;
	_Color       color_;
	_float       fontSize_;
	_bool        isCenter_;
	_float       lifeTime_; // 데미지 폰트용
};

