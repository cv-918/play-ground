#include "framework.h"
#include "RunTimeDebuggingAssistant.h"

#include "RunTimeDebugWindow.h"
#include "DWE_Text.h"
#include "DWE_CheckBox.h"
#include "DWE_Button.h"
#include "DWE_Controls.h"

namespace
{
	constexpr wchar_t kWindowListPrefix[] = L"WindowVisible:";
	constexpr wchar_t kManagerMasterKey[] = L"00_MasterVisible";
	constexpr wchar_t kManagerWindowListHeaderKey[] = L"01_WindowListHeader";

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
	z_order_.clear();
	input_window_name_.clear();
	keyboard_capture_owner_ = nullptr;
}

_bool RunTimeDebuggingAssistant::Initialize()
{
	RefreshWindowManagerControls();
	return true;
}

void RunTimeDebuggingAssistant::BeginFrame()
{
	if (debug_window_map_.empty())
		return;

	RefreshWindowManagerControls();

	for (const std::wstring& window_name : z_order_)
	{
		auto iter = debug_window_map_.find(window_name);
		if (iter != debug_window_map_.end() && ShouldProcessWindow(iter->first, iter->second))
			iter->second->BeginFrame();
	}
}

_int RunTimeDebuggingAssistant::Update(_double _delta_time)
{
	if (debug_window_map_.empty())
		return UPDATE_CONTINUE;

	const _Vector2 mouse_pos = _InputMgr.MousePoint();
	if (_InputMgr.Down(VK_LBUTTON))
	{
		input_window_name_ = FindTopWindowAtPoint(mouse_pos);
		if (!input_window_name_.empty())
			BringWindowToFront(input_window_name_);
	}
	else if (!_InputMgr.Pressed(VK_LBUTTON) && !IsKeyboardCaptured())
	{
		input_window_name_.clear();
	}

	if (!input_window_name_.empty())
	{
		auto iter = debug_window_map_.find(input_window_name_);
		if (iter == debug_window_map_.end() || !ShouldProcessWindow(iter->first, iter->second))
			input_window_name_.clear();
	}

	std::wstring input_window_name = input_window_name_;
	if (input_window_name.empty())
		input_window_name = FindTopWindowAtPoint(mouse_pos);

	for (const std::wstring& window_name : z_order_)
	{
		auto iter = debug_window_map_.find(window_name);
		if (iter == debug_window_map_.end() || !ShouldProcessWindow(iter->first, iter->second))
			continue;

		const _bool allow_input = (iter->first == input_window_name);
		iter->second->Update(_delta_time, allow_input);
	}

	return UPDATE_CONTINUE;
}

void RunTimeDebuggingAssistant::Render(_double _delta_time)
{
	if (debug_window_map_.empty())
		return;

	for (const std::wstring& window_name : z_order_)
	{
		auto iter = debug_window_map_.find(window_name);
		if (iter != debug_window_map_.end() && ShouldProcessWindow(iter->first, iter->second))
			iter->second->Render(_delta_time);
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

	if (!IsManagerWindowName(_window_name))
	{
		auto manager_iter = debug_window_map_.find(__CLASS_NAME);
		if (manager_iter != debug_window_map_.end() && manager_iter->second != nullptr)
			manager_iter->second->RemovePersistentElement(MakeWindowVisibilityKey(_window_name));
	}

	SAFE_DELETE(iter->second);
	debug_window_map_.erase(iter);
	RemoveWindowFromZOrder(_window_name);
	if (input_window_name_ == _window_name)
		input_window_name_.clear();
}

void RunTimeDebuggingAssistant::Text(const std::wstring& _window_name, const DweTextData& _data)
{
	if (_window_name.empty())
	{
		_SYSTEM_LOG_ERROR(_T("Attempted to add frame text to a debug window with an empty name."));
		return;
	}

	RunTimeDebugWindow* window = GetOrCreateWindow(_window_name);
	if (!ShouldProcessWindow(_window_name, window))
		return;

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
	z_order_.push_back(_window_name);
	return new_window;
}

void RunTimeDebuggingAssistant::RefreshWindowManagerControls()
{
	const std::wstring manager_window_name = __CLASS_NAME;
	RunTimeDebugWindow* manager_window = GetOrCreateWindow(manager_window_name);
	if (manager_window == nullptr)
		return;

	if (!manager_window->HasPersistentElement(kManagerMasterKey))
	{
		DweCheckBoxData master_data;
		master_data.label_ = L"Debug Windows Master Visible";
		master_data.value_getter_ = [this]() { return is_drawing_windows_; };
		master_data.value_setter_ = [this](_bool _visible) { SetMasterWindowVisible(_visible); };
		manager_window->AddPersistentElement(kManagerMasterKey, new DWE_CheckBox(std::move(master_data)));
	}

	if (!manager_window->HasPersistentElement(kManagerWindowListHeaderKey))
	{
		DweSeparatorData header_data;
		header_data.label_ = L"Registered Windows";
		header_data.is_header_ = true;
		manager_window->AddPersistentElement(kManagerWindowListHeaderKey, new DWE_Separator(std::move(header_data)));
	}

	for (const auto& pair : debug_window_map_)
	{
		const std::wstring& window_name = pair.first;
		if (IsManagerWindowName(window_name))
			continue;

		const std::wstring visibility_key = MakeWindowVisibilityKey(window_name);
		if (manager_window->HasPersistentElement(visibility_key))
			continue;

		DweCheckBoxData window_data;
		window_data.label_ = window_name;
		window_data.value_getter_ = [this, window_name]() { return GetWindowVisible(window_name); };
		window_data.value_setter_ = [this, window_name](_bool _visible) { SetWindowVisible(window_name, _visible); };
		manager_window->AddPersistentElement(visibility_key, new DWE_CheckBox(std::move(window_data)));
	}
}

_bool RunTimeDebuggingAssistant::IsManagerWindowName(const std::wstring& _window_name) const
{
	return _window_name == __CLASS_NAME;
}

_bool RunTimeDebuggingAssistant::ShouldProcessWindow(const std::wstring& _window_name, const RunTimeDebugWindow* _window) const
{
	if (_window == nullptr)
		return false;

	if (IsManagerWindowName(_window_name))
		return true;

	return is_drawing_windows_ && _window->IsVisible();
}

void RunTimeDebuggingAssistant::BringWindowToFront(const std::wstring& _window_name)
{
	if (_window_name.empty())
		return;

	auto iter = std::find(z_order_.begin(), z_order_.end(), _window_name);
	if (iter == z_order_.end())
		return;

	if (std::next(iter) == z_order_.end())
		return;

	z_order_.erase(iter);
	z_order_.push_back(_window_name);
}

std::wstring RunTimeDebuggingAssistant::FindTopWindowAtPoint(const _Vector2& _point) const
{
	for (auto iter = z_order_.rbegin(); iter != z_order_.rend(); ++iter)
	{
		const auto window_iter = debug_window_map_.find(*iter);
		if (window_iter == debug_window_map_.end() || !ShouldProcessWindow(window_iter->first, window_iter->second))
			continue;

		if (window_iter->second->ContainsPoint(_point))
			return window_iter->first;
	}

	return L"";
}

void RunTimeDebuggingAssistant::RemoveWindowFromZOrder(const std::wstring& _window_name)
{
	z_order_.erase(
		std::remove(z_order_.begin(), z_order_.end(), _window_name),
		z_order_.end());
}

std::wstring RunTimeDebuggingAssistant::MakeWindowVisibilityKey(const std::wstring& _window_name) const
{
	return std::wstring(kWindowListPrefix) + _window_name;
}

_bool RunTimeDebuggingAssistant::GetWindowVisible(const std::wstring& _window_name) const
{
	const auto iter = debug_window_map_.find(_window_name);
	if (iter == debug_window_map_.end() || iter->second == nullptr)
		return false;

	return iter->second->IsVisible();
}

void RunTimeDebuggingAssistant::SetWindowVisible(const std::wstring& _window_name, _bool _visible)
{
	auto iter = debug_window_map_.find(_window_name);
	if (iter == debug_window_map_.end() || iter->second == nullptr)
		return;

	if (IsManagerWindowName(_window_name))
		return;

	iter->second->SetVisible(_visible);
	if (!_visible && input_window_name_ == _window_name)
		input_window_name_.clear();
}

void RunTimeDebuggingAssistant::SetMasterWindowVisible(_bool _visible)
{
	if (is_drawing_windows_ == _visible)
		return;

	is_drawing_windows_ = _visible;
	if (!_visible && !IsManagerWindowName(input_window_name_))
		input_window_name_.clear();

	for (auto& pair : debug_window_map_)
	{
		if (IsManagerWindowName(pair.first) || pair.second == nullptr)
			continue;

		pair.second->BeginFrame();
	}
}
