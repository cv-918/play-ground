#pragma once
#include "WidgetBase.h"

struct FloatingTextCreationData
{
	FloatingTextCreationData() DEFAULT;
	FloatingTextCreationData(const _float _dmg, const _Point& _pos) : text_(std::to_wstring(s_int(_dmg))), pos_(_pos) {}
	FloatingTextCreationData(const std::wstring _text, const _Point& _pos, const _float _font_size, const _double _life_time, _Color _color)
		: text_(_text), pos_(_pos), font_size_(_font_size), life_time_(_life_time), color_(_color) {}

	std::wstring text_;
	_Vector2 pos_ = _Vector2::Zero();
	_float font_size_ = DEFAULT_FONT_SIZE_DAMAGE_FONT;
	_Size rect_size_ = DEFAULT_SIZE_DAMAGE_FONT;
	_double life_time_ = DEFAULT_FADE_DURATION_DAMAGE_FONT;
	_Color color_ = Palette::Black;
};

class Text;
class FloatingText final : public WidgetBase
{
public:
	explicit FloatingText(const FloatingTextCreationData& _data);

	_int Update(_double _delta_time) override;

private:
	FloatingTextCreationData data_;

	Text* damage_text_ = nullptr;
	_double life_time_timer_ = 0.0;
};
