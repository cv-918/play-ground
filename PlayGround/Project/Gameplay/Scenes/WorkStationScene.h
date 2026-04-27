#pragma once

#include "Scene.h"

class WorkStationScene final : public Scene
{
	enum class SampleMode
	{
		ParticleEmitter2001,
		Particle1001,
	};

public:
	explicit WorkStationScene() : Scene(SceneType::WorkStation) {}

public:
	_bool Initialize() override;
	_int Update(_double _delta_time) override;
	void Render(_double _delta_time) override;
	void OnEnter() override;

private:
	void _SelectSample(SampleMode _mode);
	void _PlaySelectedSampleAtMouse();
	void _SetStatus(const std::wstring& _text, const _Color& _color = Palette::White);
	std::wstring _GetSelectedSampleLabel() const;

private:
	SampleMode selected_sample_ = SampleMode::ParticleEmitter2001;
	std::wstring status_text_;
	_Color status_color_ = Palette::White;
};
