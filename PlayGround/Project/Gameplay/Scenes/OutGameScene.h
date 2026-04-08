#pragma once
#pragma once

#include "Scene.h"

class OutGameScene final : public Scene
{
	enum class OutGameViewState
	{
		Undefined = 0,
		Main,
		Attribute,
      VideoOption,
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

private:
	// 뷰 전환 메소드
	void _ChangeView(OutGameViewState _new_view_state);
	WidgetBase* _CreateView();

	std::wstring _GetViewName(OutGameViewState _view_state) const;

private:
	OutGameViewState view_state_ = OutGameViewState::Undefined;
	std::map<OutGameViewState, WidgetBase*> view_map_;
	WidgetBase* current_view_ = nullptr;

	class TownPlayer* test_town_player_ = nullptr;
	class TownNpc* test_town_npc_ = nullptr;
};
