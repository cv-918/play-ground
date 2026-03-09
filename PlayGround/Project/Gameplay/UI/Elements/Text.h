#pragma once
#include "../UIBase.h"

class Text final : public UIBase
{
public:
	explicit Text() : color_(Colors::Black), font_size_(12.f), is_center_(true) {}

private:
	void Render(_double _delta_time) override;

public:
	void SetText(const std::wstring& _text) { text_ = _text; }
	void SetColor(const _Color& _color) { color_ = _color; }
	void SetFontSize(_float _size) { font_size_ = _size; }

	void SetAlpha(_float _alpha) { color_.a = s_ubyte(_alpha * UCHAR_MAX); }

private:
	std::wstring text_;
	_Color color_ = Colors::Black;
	_float font_size_ = 12.f;
	_bool is_center_ = true; // 텍스트가 중앙 정렬되어 있는지 여부를 나타내는 플래그. 필요에 따라 텍스트의 정렬 방식을 결정할 때 활용할 수 있습니다.
};

