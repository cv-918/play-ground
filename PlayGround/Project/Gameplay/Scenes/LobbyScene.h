#pragma once
#include "Scene.h"

class LobbyScene final : public Scene
{
public:
	explicit LobbyScene() : Scene(SceneType::Lobby) {}

public:
	_bool Initialize() override;

	void Render(_double _delta_time) override;

	void OnEnter() override;
	void OnExit() override;
};
