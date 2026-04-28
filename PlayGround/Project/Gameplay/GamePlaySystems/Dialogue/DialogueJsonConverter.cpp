#include "framework.h"
#include "DialogueJsonConverter.h"

_bool DialogueJsonConverter::BuildSessionByKey(const std::string& _key, DialogueSessionData& _out_session)
{
	const DialogueJsonInfo* json = _DialogueJsonDataMgr.GetDataByKey(_key);
	if (json == nullptr)
	{
		_SYSTEM_LOG_ERROR(_T("Dialogue key not found: %s"), _TF(_key.c_str()));
		return false;
	}

	return Convert(*json, _out_session);
}

_bool DialogueJsonConverter::Convert(const DialogueJsonInfo& _json, DialogueSessionData& _out_session)
{
	if (!Validate(_json))
	{
		_SYSTEM_LOG_ERROR(_T("Dialogue validation failed: %s"), _TF(_json.key_.c_str()));
		return false;
	}

	_out_session = {}; // 초기화

	// 세션 ID는 key 사용
	_out_session.session_id = ToWString(_json.key_);

	// settings
	_out_session.settings.allow_auto_advance = _json.allow_auto_advance_;
	_out_session.settings.allow_skip_in_choice = _json.allow_skip_in_choice_;
	_out_session.settings.block_game_input = _json.block_game_input_;
	_out_session.settings.use_typing_effect_by_default = _json.use_typing_effect_by_default_;
	_out_session.settings.default_auto_advance_delay = _json.default_auto_advance_delay_;

	// lines
	for (const auto& json_line : _json.lines_)
	{
		DialogueLine line;

		line.message_type = ParseMessageType(json_line.message_type_);
		line.speaker_name = ToWString(json_line.speaker_name_);
		line.text = ToWString(json_line.text_);

		line.use_typing_effect = json_line.use_typing_effect_;
		line.use_auto_advance = json_line.use_auto_advance_;
		line.auto_advance_delay = json_line.auto_advance_delay_;

		line.next_index = json_line.next_index_;

		// choices
		for (const auto& json_choice : json_line.choices_)
		{
			DialogueChoice choice;
			choice.text = ToWString(json_choice.text_);
			choice.next_index = json_choice.next_index_;
			line.choices.push_back(choice);
		}

		// events
		for (const auto& json_event : json_line.events_)
		{
			DialogueEvent ev;
			ev.category = ParseEventCategory(json_event.category_);
			ev.trigger = ParseEventTrigger(json_event.trigger_);
			ev.event_id = ToWString(json_event.event_id_);
			line.events.push_back(ev);
		}

		_out_session.lines.push_back(line);
	}

	return true;
}

_bool DialogueJsonConverter::Validate(const DialogueJsonInfo& _json)
{
	// 1. 라인 존재 체크
	if (_json.lines_.empty())
	{
		_DEBUG_MSGBOX(_T("[Dialogue] lines_ empty: %s"), _TF(_json.key_.c_str()));
		return false;
	}

	const int line_count = s_int(_json.lines_.size());

	// 2. index 연속성 체크
	for (int i = 0; i < line_count; ++i)
	{
		if (_json.lines_[i].index_ != i)
		{
			_DEBUG_MSGBOX(_T("[Dialogue] index mismatch: key=%s expected=%d actual=%d"), _UtilFunc::ToWString(_json.key_).c_str(), i, _json.lines_[i].index_);
			return false;
		}
	}

	// 3. next_index 체크
	for (const auto& line : _json.lines_)
	{
		if (line.next_index_ == -1)
			continue;

		if (line.next_index_ < 0 || line.next_index_ >= line_count)
		{
			_SYSTEM_LOG_ERROR(_T("[Dialogue] invalid next_index: key=%s line=%d next=%d"), _UtilFunc::ToWString(_json.key_).c_str(), line.index_, line.next_index_);
			return false;
		}
	}

	// 4. 선택지 검증
	for (const auto& line : _json.lines_)
	{
		if (line.choices_.empty())
			continue;
		
		// 선택지 개수 0 금지 정책 이미 있음
		for (const auto& choice : line.choices_)
		{
			if (choice.next_index_ < 0 || choice.next_index_ >= line_count)
			{
				_SYSTEM_LOG_ERROR(_T("[Dialogue] invalid choice next_index: key=%s line=%d"), _UtilFunc::ToWString(_json.key_).c_str(), line.index_);
				return false;
			}
		}
	}

	// 4.5 텍스트 검증
	for (const auto& line : _json.lines_)
	{
		if (line.text_.empty())
		{
			_SYSTEM_LOG_ERROR(_T("[Dialogue] empty text: key=%s line=%d"), _UtilFunc::ToWString((_json.key_)).c_str(), line.index_);
			return false;
		}
	}

	// 5. message_type 체크
	for (const auto& line : _json.lines_)
	{
		const auto type = ParseMessageType(line.message_type_);
		if (type == DialogueMessageType::None)
		{
			_SYSTEM_LOG_ERROR(_T("[Dialogue] invalid message_type: key=%s line=%d type=%s"), _UtilFunc::ToWString(_json.key_).c_str(), line.index_, _UtilFunc::ToWString(line.message_type_).c_str());
			return false;
		}
	}

	// 5.5 auto advance 검증
	for (const auto& line : _json.lines_)
	{
		if (line.use_auto_advance_ && line.auto_advance_delay_ <= 0.0)
		{
			_SYSTEM_LOG_ERROR(_T("[Dialogue] invalid auto_advance_delay: key=%s line=%d"), _UtilFunc::ToWString(_json.key_).c_str(), line.index_);
			return false;
		}
	}

	// 6. 이벤트 검증
	for (const auto& line : _json.lines_)
	{
		for (const auto& ev : line.events_)
		{
			if (ParseEventCategory(ev.category_) == DialogueEventCategory::None)
			{
				_SYSTEM_LOG_ERROR(_T("[Dialogue] invalid event category: key=%s line=%d"), _UtilFunc::ToWString(_json.key_).c_str(), line.index_);
				return false;
			}

			if (ParseEventTrigger(ev.trigger_) == DialogueEventTrigger::None)
			{
				_SYSTEM_LOG_ERROR(_T("[Dialogue] invalid event trigger: key=%s line=%d"), _UtilFunc::ToWString(_json.key_).c_str(), line.index_);
				return false;
			}
		}
	}

	return true;
}

DialogueMessageType DialogueJsonConverter::ParseMessageType(const std::string& _str)
{
	if (_str == "dialogue") return DialogueMessageType::Dialogue;
	if (_str == "narration") return DialogueMessageType::Narration;
	if (_str == "system_message") return DialogueMessageType::SystemMessage;

	return DialogueMessageType::None;
}

DialogueEventCategory DialogueJsonConverter::ParseEventCategory(const std::string& _str)
{
	if (_str == "gameplay") return DialogueEventCategory::Gameplay;
	if (_str == "session_direction") return DialogueEventCategory::SessionDirection;

	return DialogueEventCategory::None;
}

DialogueEventTrigger DialogueJsonConverter::ParseEventTrigger(const std::string& _str)
{
	if (_str == "on_enter") return DialogueEventTrigger::OnLineEnter;
	if (_str == "on_exit") return DialogueEventTrigger::OnLineExit;

	return DialogueEventTrigger::None;
}

std::wstring DialogueJsonConverter::ToWString(const std::string& _str)
{
	if (_str.empty())
		return {};

	return _UtilFunc::ToWString(_str);
}
