#pragma once

enum class DebugWindowElementType
{
	Undefined = 0,
	Text,
	CheckBox,
	Button,
	Graph,
};

struct DweTextData
{
	DweTextData() DEFAULT;
	DweTextData(std::wstring _text) : text_(std::move(_text)) {}

	std::wstring text_;
	_Color color_ = Palette::Black;
	_float font_size_ = 12.f;
	_int style_bitmask_ = 0;

	_int alignment_horizontal_ = 0;
	_int alignment_vertical_ = 0;
};