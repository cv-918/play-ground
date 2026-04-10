#pragma once

struct Resolution
{
    _int width = 0;
    _int height = 0;

    bool operator==(const Resolution& _rhs) const
    {
        return width == _rhs.width && height == _rhs.height;
    }

    bool operator!=(const Resolution& _rhs) const
    {
        return !(*this == _rhs);
    }
};

enum class WindowMode
{
    Windowed,
    Borderless,
    BorderlessFullscreen,
};

struct VideoSettings
{
    Resolution resolution = { 1280, 720 };
#ifdef _DEBUG
    WindowMode window_mode = WindowMode::Windowed;
#else
    WindowMode window_mode = WindowMode::BorderlessFullscreen;
#endif // _DEBUG
    
    _float ui_scale = 1.0f;

    bool operator==(const VideoSettings& _rhs) const
    {
        return resolution == _rhs.resolution
            && window_mode == _rhs.window_mode
            && std::abs(ui_scale - _rhs.ui_scale) < 0.0001f;
    }

    bool operator!=(const VideoSettings& _rhs) const
    {
        return !(*this == _rhs);
    }
};
