#pragma once

#include "../IDialogueEventListener.h"

/**
 * @brief 테스트용 다이얼로그 이벤트 리스너
 */
class DialogueDebugEventListener : public IDialogueEventListener
{
public:
	/**
	 * @brief 이벤트 수신
	 */
	virtual void OnDialogueEvent(const std::wstring& _event_id) override;
};