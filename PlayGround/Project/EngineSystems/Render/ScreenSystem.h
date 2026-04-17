#pragma once

#include "VideoSettings.h"

#define _ScreenSystem ScreenSystem::Get()

class ScreenSystem : public ISingleton<ScreenSystem>
{
public:
	const Resolution& DesignResolution() const { return design_resolution_; }
	const Resolution& AssetAuthoringResolution() const { return asset_authoring_resolution_; }
	Resolution WindowResolution() const;
	WindowMode CurrentWindowMode() const { return current_window_mode_; }
	_float GetWorldResourceScale() const;
	_float GetBackgroundCoverScale() const;

	bool ApplyVideoMode(const VideoSettings& _settings);
	bool ApplyResolution(const Resolution& _resolution);
	bool ApplyWindowMode(WindowMode _mode, const Resolution& _target_resolution);

private:
	_float _CalculateAuthoringScale(_bool _use_cover_mode) const;
	_bool _ApplyWindowRect(const Resolution& _resolution, WindowMode _mode) const;

private:
	Resolution design_resolution_ = { WINCX, WINCY };
	Resolution asset_authoring_resolution_ = { 1920, 1080 };
	WindowMode current_window_mode_ = WindowMode::Windowed;
};
