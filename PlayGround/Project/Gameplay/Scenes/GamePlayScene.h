#pragma once
#include "Scene.h"

class GamePlayScene final : public Scene
{
public:
	explicit GamePlayScene() : Scene(SceneType::GamePlay) {}
	virtual ~GamePlayScene() DEFAULT;

public:
	virtual _bool Initialize() override;

	virtual _int Update(_double _delta_time) override;

	void OnEnter() override;
	void OnExit() override;
};
