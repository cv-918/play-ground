#pragma once
#include "Scene.h"

class IntroScene final: public Scene
{
public:
	explicit IntroScene() : Scene(SceneType::Intro) {}
	virtual ~IntroScene() DEFAULT;

public:
	virtual _bool Initialize() override;

	virtual _int LateUpdate(_double _delta_time) override;
	virtual void Render(_double _delta_time) override;

	void OnEnter() override;
	void OnExit() override;
};

