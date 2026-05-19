#pragma once

enum class DebugWindowElementType
{
	Undefined = 0,
	Text,
	DynamicText,
	CheckBox,
	Button,
	ButtonRow,
	Separator,
	SelectableList,
	SliderFloat,
	SliderInt,
	ComboBox,
	InputText,
	ColorEdit,
	Vector2Field,
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

struct DweDynamicTextData
{
	std::function<DweTextData()> text_provider_;
};

struct DweCheckBoxData
{
	std::wstring label_;
	std::function<_bool()> value_getter_;
	std::function<void(_bool)> value_setter_;
};

struct DweSeparatorData
{
	std::wstring label_;
	_bool is_header_ = false;
};

struct DweButtonRowButton
{
	std::wstring label_;
	std::function<void()> on_click_;
};

struct DweButtonRowData
{
	std::vector<DweButtonRowButton> buttons_;
};

struct DweSelectableListData
{
	std::wstring label_;
	std::function<std::vector<std::wstring>()> item_provider_;
	std::function<_int()> selected_index_getter_;
	std::function<void(_int)> selected_index_setter_;
	_int max_visible_items_ = 24;
};

struct DweSliderFloatData
{
	std::wstring label_;
	std::function<_float()> value_getter_;
	std::function<void(_float)> value_setter_;
	_float min_value_ = 0.f;
	_float max_value_ = 1.f;
	_float step_ = 0.01f;
	_int precision_ = 2;
};

struct DweSliderIntData
{
	std::wstring label_;
	std::function<_int()> value_getter_;
	std::function<void(_int)> value_setter_;
	_int min_value_ = 0;
	_int max_value_ = 100;
	_int step_ = 1;
};

struct DweComboBoxData
{
	std::wstring label_;
	std::function<std::vector<std::wstring>()> option_provider_;
	std::function<_int()> selected_index_getter_;
	std::function<void(_int)> selected_index_setter_;
	_int max_visible_options_ = 12;
};

struct DweInputTextData
{
	std::wstring label_;
	std::function<std::wstring()> value_getter_;
	std::function<void(const std::wstring&)> value_setter_;
	size_t max_length_ = 128;
};

struct DweColorEditData
{
	std::wstring label_;
	std::function<_Color()> value_getter_;
	std::function<void(const _Color&)> value_setter_;
};

struct DweVector2FieldData
{
	std::wstring label_;
	std::function<_Vector2()> value_getter_;
	std::function<void(const _Vector2&)> value_setter_;
	_float min_value_ = -1000.f;
	_float max_value_ = 1000.f;
	_float step_ = 1.f;
	_int precision_ = 1;
};
