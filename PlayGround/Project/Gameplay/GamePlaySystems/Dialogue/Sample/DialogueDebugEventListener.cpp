#include "framework.h"
#include "DialogueDebugEventListener.h"

#include <string>
#include <GamePlaySystems/SceneManager.h>

#include "Scenes/OutGameScene.h"

/**
 * @brief 이벤트를 로그로 남긴다.
 */
void DialogueDebugEventListener::OnDialogueEvent(const std::wstring& _event_id)
{
	OutputDebugStringW((L"[DialogueEvent] " + _event_id + L"\n").c_str());

	if (L"ToPrologue3" == _event_id)
	{
		if (_UserProfile.GetMainStoryProgress() == MainStoryProgress::Prologue2)
			_UserProfile.SetMainStoryProgress(MainStoryProgress::Prologue3);
	}

	if (L"ToPrologue4" == _event_id)
	{
		if (_UserProfile.GetMainStoryProgress() == MainStoryProgress::Prologue3)
			_UserProfile.SetMainStoryProgress(MainStoryProgress::Prologue4);
	}

	if (L"ToPrologue5" == _event_id)
	{
		if (_UserProfile.GetMainStoryProgress() == MainStoryProgress::Prologue4)
			_UserProfile.SetMainStoryProgress(MainStoryProgress::Prologue5);
	}

	if (L"ActiveRing" == _event_id)
	{
		out_game_scene_->ProcessDialogueEvent(L"ActiveRing");
	}

	if (L"ToChapter1" == _event_id)
	{
		if (_UserProfile.GetMainStoryProgress() == MainStoryProgress::Prologue5)
			_UserProfile.SetMainStoryProgress(MainStoryProgress::Chapter1);
	}
}
