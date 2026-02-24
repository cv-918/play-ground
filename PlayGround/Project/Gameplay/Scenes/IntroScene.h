#pragma once
#include "Scene.h"

class IntroScene final: public Scene
{
public:
	explicit IntroScene() : Scene(SceneType::Intro) {}
	virtual ~IntroScene() DEFAULT;

public:
	// Scene을(를) 통해 상속됨
	_bool Initialize() override;

	_int Update(_double _delta_time) override;
	_int LateUpdate(_double _delta_time) override;
	void Render(_double _delta_time) override;

	_bool Release() override;

	void OnEnter() override;
	void OnExit() override;
};

