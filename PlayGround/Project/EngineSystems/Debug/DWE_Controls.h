#pragma once

#include "DebugWindowElement.h"

class DWE_DynamicText final : public DebugWindowElement
{
public:
	explicit DWE_DynamicText(DweDynamicTextData _data)
		: DebugWindowElement(DebugWindowElementType::DynamicText)
		, data_(std::move(_data))
	{
	}

	_Vector2 Measure() const override;
	void Render(_double _delta_time) override;

private:
	DweDynamicTextData data_;
};

class DWE_Separator final : public DebugWindowElement
{
public:
	explicit DWE_Separator(DweSeparatorData _data)
		: DebugWindowElement(DebugWindowElementType::Separator)
		, data_(std::move(_data))
	{
	}

	_Vector2 Measure() const override;
	void Render(_double _delta_time) override;

private:
	DweSeparatorData data_;
};

class DWE_ButtonRow final : public DebugWindowElement
{
public:
	explicit DWE_ButtonRow(DweButtonRowData _data)
		: DebugWindowElement(DebugWindowElementType::ButtonRow)
		, data_(std::move(_data))
	{
	}

	_int Update(_double _delta_time) override;
	_Vector2 Measure() const override;
	void Render(_double _delta_time) override;

private:
	_RectF _GetButtonRect(size_t _index) const;
	_bool _IsPointInRect(const _Vector2& _point, const _RectF& _rect) const;

private:
	DweButtonRowData data_;
	_int hovered_index_ = -1;
	_int pressed_index_ = -1;
};

class DWE_SelectableList final : public DebugWindowElement
{
public:
	explicit DWE_SelectableList(DweSelectableListData _data)
		: DebugWindowElement(DebugWindowElementType::SelectableList)
		, data_(std::move(_data))
	{
	}

	_int Update(_double _delta_time) override;
	_Vector2 Measure() const override;
	void Render(_double _delta_time) override;

private:
	std::vector<std::wstring> _Items() const;
	_RectF _GetItemRect(_int _index) const;
	_bool _IsPointInRect(const _Vector2& _point, const _RectF& _rect) const;

private:
	DweSelectableListData data_;
	_int hovered_index_ = -1;
};

class DWE_SliderFloat final : public DebugWindowElement
{
public:
	explicit DWE_SliderFloat(DweSliderFloatData _data)
		: DebugWindowElement(DebugWindowElementType::SliderFloat)
		, data_(std::move(_data))
	{
	}

	_int Update(_double _delta_time) override;
	_Vector2 Measure() const override;
	void Render(_double _delta_time) override;

private:
	_RectF _GetTrackRect() const;
	_bool _IsPointInRect(const _Vector2& _point, const _RectF& _rect) const;
	_float _ReadValue() const;
	void _WriteValueFromMouseX(_float _mouse_x);

private:
	DweSliderFloatData data_;
	_bool is_dragging_ = false;
};

class DWE_SliderInt final : public DebugWindowElement
{
public:
	explicit DWE_SliderInt(DweSliderIntData _data)
		: DebugWindowElement(DebugWindowElementType::SliderInt)
		, data_(std::move(_data))
	{
	}

	_int Update(_double _delta_time) override;
	_Vector2 Measure() const override;
	void Render(_double _delta_time) override;

private:
	_RectF _GetTrackRect() const;
	_bool _IsPointInRect(const _Vector2& _point, const _RectF& _rect) const;
	_int _ReadValue() const;
	void _WriteValueFromMouseX(_float _mouse_x);

private:
	DweSliderIntData data_;
	_bool is_dragging_ = false;
};

class DWE_ComboBox final : public DebugWindowElement
{
public:
	explicit DWE_ComboBox(DweComboBoxData _data)
		: DebugWindowElement(DebugWindowElementType::ComboBox)
		, data_(std::move(_data))
	{
	}

	_int Update(_double _delta_time) override;
	_Vector2 Measure() const override;
	void Render(_double _delta_time) override;

private:
	std::vector<std::wstring> _Options() const;
	_RectF _GetHeaderRect() const;
	_RectF _GetOptionRect(_int _index) const;
	_bool _IsPointInRect(const _Vector2& _point, const _RectF& _rect) const;

private:
	DweComboBoxData data_;
	_bool is_open_ = false;
	_int hovered_option_index_ = -1;
};

class DWE_InputText final : public DebugWindowElement
{
public:
	explicit DWE_InputText(DweInputTextData _data)
		: DebugWindowElement(DebugWindowElementType::InputText)
		, data_(std::move(_data))
	{
	}
	~DWE_InputText() override;

	_int Update(_double _delta_time) override;
	_Vector2 Measure() const override;
	void Render(_double _delta_time) override;

private:
	_RectF _GetEditRect() const;
	_bool _IsPointInRect(const _Vector2& _point, const _RectF& _rect) const;
	std::wstring _ReadValue() const;
	void _Commit();

private:
	DweInputTextData data_;
	std::wstring editing_text_;
	_bool is_focused_ = false;
};

class DWE_ColorEdit final : public DebugWindowElement
{
public:
	explicit DWE_ColorEdit(DweColorEditData _data)
		: DebugWindowElement(DebugWindowElementType::ColorEdit)
		, data_(std::move(_data))
	{
	}

	_int Update(_double _delta_time) override;
	_Vector2 Measure() const override;
	void Render(_double _delta_time) override;

private:
	_RectF _GetChannelTrackRect(_int _channel_index) const;
	_bool _IsPointInRect(const _Vector2& _point, const _RectF& _rect) const;
	_Color _ReadValue() const;
	void _WriteChannelFromMouseX(_int _channel_index, _float _mouse_x);

private:
	DweColorEditData data_;
	_int active_channel_index_ = -1;
};

class DWE_Vector2Field final : public DebugWindowElement
{
public:
	explicit DWE_Vector2Field(DweVector2FieldData _data)
		: DebugWindowElement(DebugWindowElementType::Vector2Field)
		, data_(std::move(_data))
	{
	}

	_int Update(_double _delta_time) override;
	_Vector2 Measure() const override;
	void Render(_double _delta_time) override;

private:
	_RectF _GetAxisTrackRect(_int _axis_index) const;
	_bool _IsPointInRect(const _Vector2& _point, const _RectF& _rect) const;
	_Vector2 _ReadValue() const;
	void _WriteAxisFromMouseX(_int _axis_index, _float _mouse_x);

private:
	DweVector2FieldData data_;
	_int active_axis_index_ = -1;
};
