#pragma once
#include "Scene.h"

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
	void Render(_double _delta_time) override;

	void OnEnter() override;
	void OnExit() override;

public:
	// GameObject 생성 메서드들
	void SpawnProjectile(GameObjectBase* _owner, const _Point& _position, const _Point& _target, _float _damage, _float _speed);

	// UI 노출 메서드들
	void ShowDamageUI(_float _damage, const _Point& _position);

	// 뷰 전환 메소드
	void ChangeView(InGameViewState _new_view_state);

private:
	WidgetBase* _CreateView();

private:
	class StageManager* stage_manager_ = nullptr;
	class Background* background_ = nullptr;

	InGameViewState view_state_ = InGameViewState::Undefined;
	std::map<InGameViewState, class WidgetBase*> view_map_;
	WidgetBase* current_view_ = nullptr;
};
