#pragma once
#include "Scene.h"

class LoadingScene final : public Scene
{
public:
	explicit LoadingScene() : Scene(SceneType::Loading) {}
	virtual ~LoadingScene() DEFAULT;

public:
	// Scene을(를) 통해 상속됨
	_bool Initialize() override;

	_int Update(_double _delta_time) override;
	_int LateUpdate(_double _delta_time) override;
	void Render(_double _delta_time) override;

	_bool Release() override;

	void OnEnter() override;
	void OnExit() override;

private:
	_int loading_progress_ = 0; // 로딩 진행 상황을 나타내는 변수 (0~100)
	_bool loading_complete_ = false; // 로딩 완료 여부를 나타내는 변수
};
