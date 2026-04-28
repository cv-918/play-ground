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
	void OnDialogueEvent(const std::wstring& _event_id) override;

	/**
	 * @brief OutGameScene 포인터 설정. 필요에 따라 이벤트 처리 시 씬의 상태를 변경하는 로직을 구현할 수 있습니다.
	 */
	void SetOutGameScene(class OutGameScene* _scene) { out_game_scene_ = _scene; }

private:
	class OutGameScene* out_game_scene_ = nullptr;
};
