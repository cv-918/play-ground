#pragma once

#include "GamePlaySystems/Json/DialogueJsonDataManager.h"
#include "DialogueTypes.h"

/**
 * @brief JSON → Runtime DialogueSessionData 변환기
 */
class DialogueJsonConverter
{
public:
	/**
	 * @brief key로 세션 생성
	 */
	static _bool BuildSessionByKey(const std::string& _key, DialogueSessionData& _out_session);

private:
	static _bool Convert(const DialogueJsonInfo& _json, DialogueSessionData& _out_session);
	static _bool Validate(const DialogueJsonInfo& _json);

private:
	static DialogueMessageType ParseMessageType(const std::string& _str);
	static DialogueEventCategory ParseEventCategory(const std::string& _str);
	static DialogueEventTrigger ParseEventTrigger(const std::string& _str);

	static std::wstring ToWString(const std::string& _str);
};