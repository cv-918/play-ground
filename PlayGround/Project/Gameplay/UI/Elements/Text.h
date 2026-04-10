#pragma once
#include "../UIBase.h"

class Text final : public UIBase
{
public:
	explicit Text() : color_(Palette::Black), font_size_(12.f), is_center_(true) {}

	void Render(_double _delta_time) override;

public:
  void SetText(const std::wstring& _text);
	void SetColor(const _Color& _color) { color_ = _color; }
	void SetFontSize(_float _size) { font_size_ = _size; }

	void SetAlpha(_float _alpha) { color_.SetAlpha(_alpha); }

	void SetCenterAligned(_bool _is_center) { is_center_ = _is_center; }
	_bool IsCenterAligned() const { return is_center_; }

private:
	std::wstring text_;
	_Color color_ = Palette::Black;
	_float font_size_ = 12.f;
	_bool is_center_ = false;
};