#pragma once
#include "Scene.h"

class IntroScene final: public Scene
{
public:
	explicit IntroScene() : Scene(SceneType::Intro) {}

public:
	_bool Initialize() override;
	_int LateUpdate(_double _delta_time) override;
};

