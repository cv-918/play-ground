#pragma once

#include "DebugAssistantHeader.h"
#define _Assist RunTimeDebuggingAssistant::Get()

class RunTimeDebuggingAssistant final
	: public ISingleton<RunTimeDebuggingAssistant>
	, public IInitializable
{
	friend class ISingleton<RunTimeDebuggingAssistant>;

public:
	~RunTimeDebuggingAssistant();

	_bool Initialize() override;

	void BeginFrame();
	_int Update(_double _delta_time);
	void Render(_double _delta_time);

	void CaptureKeyboard(const void* _owner);
	void ReleaseKeyboard(const void* _owner);
	_bool IsKeyboardCaptured() const { return keyboard_capture_owner_ != nullptr; }

	void RemoveWindow(const std::wstring& _window_name);

	void Text(const std::wstring& _window_name, const DweTextData& _data);
	void PersistentText(const std::wstring& _window_name, const std::wstring& _key, const DweTextData& _data);
	void CheckBox(const std::wstring& _window_name, const std::wstring& _key, const std::wstring& _label, _bool* _value_ptr);
	void CheckBox(const std::wstring& _window_name, const std::wstring& _key, DweCheckBoxData _data);
	void Button(const std::wstring& _window_name, const std::wstring& _key, const std::wstring& _label, std::function<void()> _on_click);
	void DynamicText(const std::wstring& _window_name, const std::wstring& _key, DweDynamicTextData _data);
	void Separator(const std::wstring& _window_name, const std::wstring& _key, DweSeparatorData _data);
	void ButtonRow(const std::wstring& _window_name, const std::wstring& _key, DweButtonRowData _data);
	void SelectableList(const std::wstring& _window_name, const std::wstring& _key, DweSelectableListData _data);
	void SliderFloat(const std::wstring& _window_name, const std::wstring& _key, DweSliderFloatData _data);
	void SliderInt(const std::wstring& _window_name, const std::wstring& _key, DweSliderIntData _data);
	void ComboBox(const std::wstring& _window_name, const std::wstring& _key, DweComboBoxData _data);
	void InputText(const std::wstring& _window_name, const std::wstring& _key, DweInputTextData _data);
	void ColorEdit(const std::wstring& _window_name, const std::wstring& _key, DweColorEditData _data);
	void Vector2Field(const std::wstring& _window_name, const std::wstring& _key, DweVector2FieldData _data);

private:
	class RunTimeDebugWindow* GetOrCreateWindow(const std::wstring& _window_name);
	void RefreshWindowManagerControls();
	_bool IsManagerWindowName(const std::wstring& _window_name) const;
	_bool ShouldProcessWindow(const std::wstring& _window_name, const class RunTimeDebugWindow* _window) const;
	void BringWindowToFront(const std::wstring& _window_name);
	std::wstring FindTopWindowAtPoint(const _Vector2& _point) const;
	void RemoveWindowFromZOrder(const std::wstring& _window_name);
	std::wstring MakeWindowVisibilityKey(const std::wstring& _window_name) const;
	_bool GetWindowVisible(const std::wstring& _window_name) const;
	void SetWindowVisible(const std::wstring& _window_name, _bool _visible);
	void SetMasterWindowVisible(_bool _visible);

private:
	std::unordered_map<std::wstring, class RunTimeDebugWindow*> debug_window_map_;
	std::vector<std::wstring> z_order_;
	std::wstring input_window_name_;
	const void* keyboard_capture_owner_ = nullptr;

	_bool is_drawing_windows_ = true;
};
