#pragma once
#include "Scene.h"

class StageManager;
class Background;

class GamePlayScene final : public Scene
{
public:
	explicit GamePlayScene() : Scene(SceneType::GamePlay) {}

public:
	_bool Initialize() override;

	_int Update(_double _delta_time) override;
	void Render(_double _delta_time) override;

	_bool Release() override;

	void OnEnter() override;
	void OnExit() override;

public:
	void SpawnPlayer();
	void SpawnEnemy(_uint _enemy_id);

	// UI 노출 메서드들
	void ShowResultUI();
	void ShowDamageUI(_float _damage, const _Point& _position);

private:
	StageManager* stage_manager_ = nullptr;

	Background* background_ = nullptr;
	Button* return_btn_ = nullptr;
};
