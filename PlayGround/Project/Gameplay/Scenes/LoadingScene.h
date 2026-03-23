#pragma once
#include "Scene.h"

class LoadingScene final : public Scene
{
public:
	explicit LoadingScene() : Scene(SceneType::Loading) {}

public:
	_bool Initialize() override;
	_int Update(_double _delta_time) override;
	_int LateUpdate(_double _delta_time) override;
	void Render(_double _delta_time) override;

	void OnExit() override;

private:
	_double elapsed_time_ = 0.0; // 로딩에 걸린 시간을 나타내는 변수
	_int loading_progress_ = 0; // 로딩 진행 상황을 나타내는 변수 (0~100)
	_bool loading_complete_ = false; // 로딩 완료 여부를 나타내는 변수

	std::wstring debug_scene_name_;
};
