#pragma once
#include "Scene.h"

class StageManager;
class Background;

class GamePlayScene final : public Scene
{
public:
	explicit GamePlayScene() : Scene(SceneType::GamePlay) {}
	virtual ~GamePlayScene() DEFAULT;

public:
	_bool Initialize() override;

	_int Update(_double _delta_time) override;

	void OnEnter() override;
	void OnExit() override;

public:
	void ShowResultUI();
	void ShowDamageUI(_float _damage, const _Point& _position);

private:
	StageManager* stage_manager_ = nullptr;
	Background* background_ = nullptr;

	UIButton* return_btn_ = nullptr;
};
