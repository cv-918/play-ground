#pragma once
#include "Scene.h"

class IntroScene final : public Scene
{
	enum class IntroSceneImageId
	{
		Scene = 0,
		Title,
		PressAnyKey,
		Count,
	};

	struct IntroSceneImageEntity
	{
		TextureResource* texture = nullptr;
		_float opacity = 0.f; // 0.0 (투명) ~ 1.0 (불투명)
		_Vector2 offset = _Vector2::Zero();
		_RectF render_dest_rect;
	};

	enum class IntroSceneState
	{
		None,
		SceneFadeIn,
		TitleFadeIn,
		PressAnyKeyBlink,
	};

public:
	explicit IntroScene() : Scene(SceneType::Intro) {}

public:
	_bool Initialize() override;
	_int Update(_double _delta_time) override;
	void Render(_double _delta_time) override;

private:
	std::vector<IntroSceneImageEntity> images_;
	_double elapsed_time_ = 0.0; // 씬에 머문 시간 추적

	IntroSceneState current_state_ = IntroSceneState::None;
	_bool is_press_any_key_fading_in_ = false;

#ifndef SHIPPING
	class Button* debug_particle_station_button_ = nullptr;
#endif // SHIPPING
};

