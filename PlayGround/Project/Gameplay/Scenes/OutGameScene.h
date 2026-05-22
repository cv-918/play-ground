#pragma once
#include "Scene.h"
#include <cstdint>
#include <map>

#include "GamePlaySystems/Dialogue/DialogueSystem.h"
#include "GamePlaySystems/Dialogue/DialogueJsonConverter.h"
#include "GamePlaySystems/Dialogue/Sample/DialogueSampleFactory.h"
#include "GamePlaySystems/Dialogue/Sample/DialogueDebugEventListener.h"

class OutGameScene final : public Scene
{
	enum class SceneSequenceProgress
	{
		Undefined = 0,
		Prologue,

	};

	enum class OutGameViewState
	{
		Undefined = 0,
		Main,
		Attribute,
		Skill,
		Option,
		Exit,
	};

public:
	explicit OutGameScene() : Scene(SceneType::OutGame) {}

public:
	_bool Initialize() override;
	_int Update(_double _delta_time) override;
	_int LateUpdate(_double _delta_time) override;
	void Render(_double _delta_time) override;

	void OnEnter() override;
	void OnExit() override;
	SceneEnterOverlayPolicy GetEnterOverlayPolicy() const override;
	void RenderAboveTransitionOverlay(_double _delta_time) override;

	void ProcessDialogueEvent(const std::wstring& _event_id);

private:
	void _ChangeView(OutGameViewState _new_view_state);
	WidgetBase* _CreateView();
	void _TrackView(OutGameViewState _state, WidgetBase* _view);
	void _HandleViewDestroyed(OutGameViewState _state, WidgetBase* _view);
	void _ClearTrackedViews();

	void _HandleViewportChanged();
	_int _HandleSceneInput();
	void _RequestMainExit();
	void _ConsumeDialogueSessionResult(const DialogueSessionResult& _result);

	std::wstring _GetViewName(OutGameViewState _view_state) const;

private:
	OutGameViewState view_state_ = OutGameViewState::Undefined;
	std::map<OutGameViewState, WidgetBase*> view_map_;
	std::map<WidgetBase*, IDestroyable::DestructionCallbackId> view_callback_ids_;
	WidgetBase* current_view_ = nullptr;

	class TownPlayer* test_town_player_ = nullptr;
	std::vector<class TownNpc*> npcs_;
	class Background* background_ = nullptr;
	uint64_t last_applied_video_revision_ = 0;
	_bool hold_enter_black_ = false;

	// s, [ Dialogue System Test ]
	DialogueSystem dialogue_system_;
	DialogueDebugEventListener dialogue_event_listener_;

	_bool should_talk_to_elder_ = false;
	// e, [ Dialogue System Test ]
};
