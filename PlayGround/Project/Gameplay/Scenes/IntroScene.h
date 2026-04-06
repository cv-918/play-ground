#pragma once
#include "Scene.h"

class IntroScene final: public Scene
{
public:
	explicit IntroScene() : Scene(SceneType::Intro) {}

public:
	_bool Initialize() override;
	_int Update(_double _delta_time) override;
	void Render(_double _delta_time) override;

private:
 TextureResource* scene_image_ = nullptr;
	RenderRectF scene_image_rect_;

	_double elapsed_time_ = 0.0; // 씬에 머문 시간 추적
};

