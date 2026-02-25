#pragma once
#include "Scene.h"

class GamePlayScene final : public Scene
{
public:
	explicit GamePlayScene() : Scene(SceneType::GamePlay) {}
	virtual ~GamePlayScene() DEFAULT;

public:
	virtual _bool Initialize() override;

	void OnEnter() override;
	void OnExit() override;
};
