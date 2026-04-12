#include "framework.h"
#include "DialogueDebugEventListener.h"

#include <string>

/**
 * @brief 이벤트를 로그로 남긴다.
 */
void DialogueDebugEventListener::OnDialogueEvent(const std::wstring& _event_id)
{
	// TODO:
	// 프로젝트 로그 시스템에 맞춰 교체
	// 임시 확인용
	OutputDebugStringW((L"[DialogueEvent] " + _event_id + L"\n").c_str());
}