#include "framework.h"
#include "RunTimeDebuggingAssistant.h"

#include "RunTimeDebugWindow.h"
#include "DWE_Text.h"
#include "DWE_CheckBox.h"
#include "DWE_Button.h"
#include "DWE_Controls.h"

namespace
{
	_bool IsValidWindowAndKey(const std::wstring& _window_name, const std::wstring& _key, const wchar_t* _element_name)
	{
		if (_window_name.empty())
		{
			_SYSTEM_LOG_ERROR(L"Attempted to add %s to a debug window with an empty name.", _element_name);
			return false;
		}

		if (_key.empty())
		{
			_SYSTEM_LOG_ERROR(L"Attempted to add %s with an empty key.", _element_name);
			return false;
		}

		return true;
	}
}

RunTimeDebuggingAssistant::~RunTimeDebuggingAssistant()
{
	for (auto& pair : debug_window_map_)
		SAFE_DELETE(pair.second);

	debug_window_map_.clear();
	keyboard_capture_owner_ = nullptr;
}

_bool RunTimeDebuggingAssistant::Initialize()
{
	_Assist.CheckBox(__CLASS_NAME, L"AssistGlobal", L"IsDrawingWindows", &is_drawing_windows_);
	front_window_iter_ = debug_window_map_.begin();
	return true;
}

void RunTimeDebuggingAssistant::BeginFrame()
{
	if (debug_window_map_.empty())
		return;

	if (!is_drawing_windows_)
	{
		if (front_window_iter_ == debug_window_map_.end())
			front_window_iter_ = debug_window_map_.begin();

		front_window_iter_->second->BeginFrame(); // 최소한 하나의 창은 BeginFrame을 호출하여 프레임 요소를 초기화하도록 한다.
		return;
	}

	for (auto& pair : debug_window_map_)
	{
		if (pair.second)
			pair.second->BeginFrame();
	}
}

_int RunTimeDebuggingAssistant::Update(_double _delta_time)
{
	if (debug_window_map_.empty())
		return UPDATE_CONTINUE;

	if (!is_drawing_windows_)
	{
		if (front_window_iter_ == debug_window_map_.end())
			front_window_iter_ = debug_window_map_.begin();

		front_window_iter_->second->Update(_delta_time); // 최소한 하나의 창은 Update를 호출하여 프레임 요소를 업데이트하도록 한다.
		return UPDATE_CONTINUE;
	}

	for (const auto& debug_window : debug_window_map_)
	{
		if (debug_window.second)
			debug_window.second->Update(_delta_time);
	}

	return UPDATE_CONTINUE;
}

void RunTimeDebuggingAssistant::Render(_double _delta_time)
{
	if (debug_window_map_.empty())
		return;

	if (!is_drawing_windows_)
	{
		if (front_window_iter_ == debug_window_map_.end())
			front_window_iter_ = debug_window_map_.begin();

		front_window_iter_->second->Render(_delta_time); // 최소한 하나의 창은 Render를 호출하여 프레임 요소를 렌더링하도록 한다.
		return;
	}

	for (const auto& debug_window : debug_window_map_)
	{
		if (debug_window.second)
			debug_window.second->Render(_delta_time);
	}
}

void RunTimeDebuggingAssistant::CaptureKeyboard(const void* _owner)
{
	if (_owner == nullptr)
		return;

	keyboard_capture_owner_ = _owner;
}

void RunTimeDebuggingAssistant::ReleaseKeyboard(const void* _owner)
{
	if (_owner == nullptr || keyboard_capture_owner_ != _owner)
		return;

	keyboard_capture_owner_ = nullptr;
}

void RunTimeDebuggingAssistant::RemoveWindow(const std::wstring& _window_name)
{
	auto iter = debug_window_map_.find(_window_name);
	if (iter == debug_window_map_.end())
		return;

	SAFE_DELETE(iter->second);
	debug_window_map_.erase(iter);
	front_window_iter_ = debug_window_map_.begin();
}

void RunTimeDebuggingAssistant::Text(const std::wstring& _window_name, const DweTextData& _data)
{
	if (_window_name.empty())
	{
		_SYSTEM_LOG_ERROR(_T("Attempted to add frame text to a debug window with an empty name."));
		return;
	}

	RunTimeDebugWindow* window = GetOrCreateWindow(_window_name);
	window->AddFrameElement(new DWE_Text(_data));
}

void RunTimeDebuggingAssistant::PersistentText(const std::wstring& _window_name, const std::wstring& _key, const DweTextData& _data)
{
	if (!IsValidWindowAndKey(_window_name, _key, L"persistent text"))
		return;

	RunTimeDebugWindow* window = GetOrCreateWindow(_window_name);
	window->AddPersistentElement(_key, new DWE_Text(_data));
}

void RunTimeDebuggingAssistant::CheckBox(const std::wstring& _window_name, const std::wstring& _key, const std::wstring& _label, _bool* _value_ptr)
{
	if (!IsValidWindowAndKey(_window_name, _key, L"checkbox"))
		return;

	if (_value_ptr == nullptr)
	{
		_SYSTEM_LOG_ERROR(_T("Attempted to add checkbox with a null value pointer."));
		return;
	}

	RunTimeDebugWindow* window = GetOrCreateWindow(_window_name);
	window->AddPersistentElement(_key, new DWE_CheckBox(_label, _value_ptr));
}

void RunTimeDebuggingAssistant::CheckBox(const std::wstring& _window_name, const std::wstring& _key, DweCheckBoxData _data)
{
	if (!IsValidWindowAndKey(_window_name, _key, L"checkbox"))
		return;

	if (!_data.value_getter_ || !_data.value_setter_)
	{
		_SYSTEM_LOG_ERROR(_T("Attempted to add checkbox with an incomplete binding."));
		return;
	}

	RunTimeDebugWindow* window = GetOrCreateWindow(_window_name);
	window->AddPersistentElement(_key, new DWE_CheckBox(std::move(_data)));
}

void RunTimeDebuggingAssistant::Button(const std::wstring& _window_name, const std::wstring& _key, const std::wstring& _label, std::function<void()> _on_click)
{
	if (!IsValidWindowAndKey(_window_name, _key, L"button"))
		return;

	RunTimeDebugWindow* window = GetOrCreateWindow(_window_name);
	window->AddPersistentElement(_key, new DWE_Button(_label, std::move(_on_click)));
}

void RunTimeDebuggingAssistant::DynamicText(const std::wstring& _window_name, const std::wstring& _key, DweDynamicTextData _data)
{
	if (!IsValidWindowAndKey(_window_name, _key, L"dynamic text"))
		return;

	RunTimeDebugWindow* window = GetOrCreateWindow(_window_name);
	window->AddPersistentElement(_key, new DWE_DynamicText(std::move(_data)));
}

void RunTimeDebuggingAssistant::Separator(const std::wstring& _window_name, const std::wstring& _key, DweSeparatorData _data)
{
	if (!IsValidWindowAndKey(_window_name, _key, L"separator"))
		return;

	RunTimeDebugWindow* window = GetOrCreateWindow(_window_name);
	window->AddPersistentElement(_key, new DWE_Separator(std::move(_data)));
}

void RunTimeDebuggingAssistant::ButtonRow(const std::wstring& _window_name, const std::wstring& _key, DweButtonRowData _data)
{
	if (!IsValidWindowAndKey(_window_name, _key, L"button row"))
		return;

	RunTimeDebugWindow* window = GetOrCreateWindow(_window_name);
	window->AddPersistentElement(_key, new DWE_ButtonRow(std::move(_data)));
}

void RunTimeDebuggingAssistant::SelectableList(const std::wstring& _window_name, const std::wstring& _key, DweSelectableListData _data)
{
	if (!IsValidWindowAndKey(_window_name, _key, L"selectable list"))
		return;

	RunTimeDebugWindow* window = GetOrCreateWindow(_window_name);
	window->AddPersistentElement(_key, new DWE_SelectableList(std::move(_data)));
}

void RunTimeDebuggingAssistant::SliderFloat(const std::wstring& _window_name, const std::wstring& _key, DweSliderFloatData _data)
{
	if (!IsValidWindowAndKey(_window_name, _key, L"float slider"))
		return;

	RunTimeDebugWindow* window = GetOrCreateWindow(_window_name);
	window->AddPersistentElement(_key, new DWE_SliderFloat(std::move(_data)));
}

void RunTimeDebuggingAssistant::SliderInt(const std::wstring& _window_name, const std::wstring& _key, DweSliderIntData _data)
{
	if (!IsValidWindowAndKey(_window_name, _key, L"integer slider"))
		return;

	RunTimeDebugWindow* window = GetOrCreateWindow(_window_name);
	window->AddPersistentElement(_key, new DWE_SliderInt(std::move(_data)));
}

void RunTimeDebuggingAssistant::ComboBox(const std::wstring& _window_name, const std::wstring& _key, DweComboBoxData _data)
{
	if (!IsValidWindowAndKey(_window_name, _key, L"combo box"))
		return;

	RunTimeDebugWindow* window = GetOrCreateWindow(_window_name);
	window->AddPersistentElement(_key, new DWE_ComboBox(std::move(_data)));
}

void RunTimeDebuggingAssistant::InputText(const std::wstring& _window_name, const std::wstring& _key, DweInputTextData _data)
{
	if (!IsValidWindowAndKey(_window_name, _key, L"input text"))
		return;

	RunTimeDebugWindow* window = GetOrCreateWindow(_window_name);
	window->AddPersistentElement(_key, new DWE_InputText(std::move(_data)));
}

void RunTimeDebuggingAssistant::ColorEdit(const std::wstring& _window_name, const std::wstring& _key, DweColorEditData _data)
{
	if (!IsValidWindowAndKey(_window_name, _key, L"color edit"))
		return;

	RunTimeDebugWindow* window = GetOrCreateWindow(_window_name);
	window->AddPersistentElement(_key, new DWE_ColorEdit(std::move(_data)));
}

void RunTimeDebuggingAssistant::Vector2Field(const std::wstring& _window_name, const std::wstring& _key, DweVector2FieldData _data)
{
	if (!IsValidWindowAndKey(_window_name, _key, L"vector2 field"))
		return;

	RunTimeDebugWindow* window = GetOrCreateWindow(_window_name);
	window->AddPersistentElement(_key, new DWE_Vector2Field(std::move(_data)));
}

RunTimeDebugWindow* RunTimeDebuggingAssistant::GetOrCreateWindow(const std::wstring& _window_name)
{
	auto it = debug_window_map_.find(_window_name);
	if (it != debug_window_map_.end())
		return it->second;

	RunTimeDebugWindow* new_window = new RunTimeDebugWindow();
	new_window->Title(_window_name);

	const _int window_index = static_cast<_int>(debug_window_map_.size());
	new_window->Position(_Vector2(30.f + window_index * 24.f, 30.f + window_index * 24.f));

	debug_window_map_[_window_name] = new_window;
	return new_window;
}
