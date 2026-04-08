#pragma once

#include "VideoSettings.h"

#define _ScreenSystem ScreenSystem::Get()

class ScreenSystem : public ISingleton<ScreenSystem>
{
public:
    const Resolution& DesignResolution() const { return design_resolution_; }
    Resolution WindowResolution() const;
    WindowMode CurrentWindowMode() const { return current_window_mode_; }

    bool ApplyVideoMode(const VideoSettings& _settings);
    bool ApplyResolution(const Resolution& _resolution);
    bool ApplyWindowMode(WindowMode _mode, const Resolution& _target_resolution);

private:
    _bool _ApplyWindowRect(const Resolution& _resolution, WindowMode _mode) const;

private:
    Resolution design_resolution_ = { WINCX, WINCY };
    WindowMode current_window_mode_ = WindowMode::Windowed;
};
