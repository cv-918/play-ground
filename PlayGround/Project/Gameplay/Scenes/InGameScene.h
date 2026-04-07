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
	_int LateUpdate(_double _delta_time) override;
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

	void SetUpdateObjects(_bool _update) { update_objects_ = _update; }

private:
	WidgetBase* _CreateView();

private:
	class StageManager* stage_manager_ = nullptr;
	class Background* background_ = nullptr;

	InGameViewState view_state_ = InGameViewState::Undefined;
	std::map<InGameViewState, WidgetBase*> view_map_;
	WidgetBase* current_view_ = nullptr;

	_bool update_objects_ = false; // 스테이지 상태에 따라 게임 오브젝트 업데이트 여부를 결정하는 플래그. 예를 들어, 일시정지나 결과 화면에서는 게임 오브젝트 업데이트를 멈추고 UI만 업데이트하도록 활용할 수 있습니다.
};
