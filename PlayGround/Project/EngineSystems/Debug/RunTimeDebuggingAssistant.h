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

	void Text(const std::wstring& _window_name, const DweTextData& _data);
	void PersistentText(const std::wstring& _window_name, const std::wstring& _key, const DweTextData& _data);
	void CheckBox(const std::wstring& _window_name, const std::wstring& _key, const std::wstring& _label, _bool* _value_ptr);
	void Button(const std::wstring& _window_name, const std::wstring& _key, const std::wstring& _label, std::function<void()> _on_click);

private:
	class RunTimeDebugWindow* GetOrCreateWindow(const std::wstring& _window_name);

private:
	std::unordered_map<std::wstring, class RunTimeDebugWindow*> debug_window_map_;

	_bool is_drawing_windows_ = true;
	std::unordered_map<std::wstring, class RunTimeDebugWindow*>::iterator front_window_iter_;
};