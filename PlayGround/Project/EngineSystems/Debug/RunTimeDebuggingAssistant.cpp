#include "framework.h"
#include "RunTimeDebuggingAssistant.h"

#include "RunTimeDebugWindow.h"
#include "DWE_Text.h"
#include "DWE_CheckBox.h"
#include "DWE_Button.h"

RunTimeDebuggingAssistant::~RunTimeDebuggingAssistant()
{
	for (auto& pair : debug_window_map_)
		SAFE_DELETE(pair.second);

	debug_window_map_.clear();
}

void RunTimeDebuggingAssistant::BeginFrame()
{
	for (auto& pair : debug_window_map_)
	{
		if (pair.second)
			pair.second->BeginFrame();
	}
}

_int RunTimeDebuggingAssistant::Update(_double _delta_time)
{
	for (const auto& debug_window : debug_window_map_)
	{
		if (debug_window.second)
			debug_window.second->Update(_delta_time);
	}

	return UPDATE_CONTINUE;
}

void RunTimeDebuggingAssistant::Render(_double _delta_time)
{
	for (const auto& debug_window : debug_window_map_)
	{
		if (debug_window.second)
			debug_window.second->Render(_delta_time);
	}
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
	if (_window_name.empty())
	{
		_SYSTEM_LOG_ERROR(_T("Attempted to add persistent text to a debug window with an empty name."));
		return;
	}

	if (_key.empty())
	{
		_SYSTEM_LOG_ERROR(_T("Attempted to add persistent text with an empty key."));
		return;
	}

	RunTimeDebugWindow* window = GetOrCreateWindow(_window_name);
	window->AddPersistentElement(_key, new DWE_Text(_data));
}

void RunTimeDebuggingAssistant::CheckBox(const std::wstring& _window_name, const std::wstring& _key, const std::wstring& _label, _bool* _value_ptr)
{
	if (_window_name.empty())
	{
		_SYSTEM_LOG_ERROR(_T("Attempted to add checkbox to a debug window with an empty name."));
		return;
	}

	if (_key.empty())
	{
		_SYSTEM_LOG_ERROR(_T("Attempted to add checkbox with an empty key."));
		return;
	}

	if (_value_ptr == nullptr)
	{
		_SYSTEM_LOG_ERROR(_T("Attempted to add checkbox with a null value pointer."));
		return;
	}

	RunTimeDebugWindow* window = GetOrCreateWindow(_window_name);
	window->AddPersistentElement(_key, new DWE_CheckBox(_label, _value_ptr));
}

void RunTimeDebuggingAssistant::Button(const std::wstring& _window_name, const std::wstring& _key, const std::wstring& _label, std::function<void()> _on_click)
{
	if (_window_name.empty())
	{
		_SYSTEM_LOG_ERROR(_T("Attempted to add button to a debug window with an empty name."));
		return;
	}

	if (_key.empty())
	{
		_SYSTEM_LOG_ERROR(_T("Attempted to add button with an empty key."));
		return;
	}

	RunTimeDebugWindow* window = GetOrCreateWindow(_window_name);
	window->AddPersistentElement(_key, new DWE_Button(_label, std::move(_on_click)));
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