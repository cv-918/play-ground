#pragma once
#include "Scene.h"
#include "Common/HitReaction.h"
#include <map>

enum class InGameViewState
{
	Undefined = 0,
	InGame,
	Pause,
	Result,
};

class InGameScene final : public Scene
{
public:
	explicit InGameScene() : Scene(SceneType::InGame) {}

public:
	_bool Initialize() override;
	_int Update(_double _delta_time) override;
	_int LateUpdate(_double _delta_time) override;
	void Render(_double _delta_time) override;

	void OnEnter() override;
	void OnExit() override;

public:
	// GameObject 생성 메서드들
	void SpawnProjectile(GameObjectBase* _owner, const _Point& _position, const _Point& _target, _float _damage, _float _speed, const HitReactionProfile& _reaction);

	// UI 노출 메서드들
	void ShowDamageUI(_float _damage, const _Point& _position);

	// 뷰 전환 메소드
	void ChangeView(InGameViewState _new_view_state);

private:
	WidgetBase* _CreateView();
	void _TrackView(InGameViewState _state, WidgetBase* _view);
	void _HandleViewDestroyed(InGameViewState _state, WidgetBase* _view);
	void _ClearTrackedViews();
	void _SyncCursorVisibility();

private:
	class StageManager* stage_manager_ = nullptr;
	class Background* background_ = nullptr;

	InGameViewState view_state_ = InGameViewState::Undefined;
	std::map<InGameViewState, WidgetBase*> view_map_;
	std::map<WidgetBase*, IDestroyable::DestructionCallbackId> view_callback_ids_;
	WidgetBase* current_view_ = nullptr;
};
