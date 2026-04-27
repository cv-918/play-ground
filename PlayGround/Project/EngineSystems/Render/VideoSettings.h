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
#ifndef SHIPPING
	WindowMode window_mode = WindowMode::Windowed;
#else
	WindowMode window_mode = WindowMode::BorderlessFullscreen;
#endif // SHIPPING

	_float ui_scale = 1.0f;
	bool frame_limit_enabled = true;
	_uint target_fps = 144;

	bool operator==(const VideoSettings& _rhs) const
	{
		return resolution == _rhs.resolution
			&& window_mode == _rhs.window_mode
			&& std::abs(ui_scale - _rhs.ui_scale) < 0.0001f
			&& frame_limit_enabled == _rhs.frame_limit_enabled
			&& target_fps == _rhs.target_fps;
	}

	bool operator!=(const VideoSettings& _rhs) const
	{
		return !(*this == _rhs);
	}
};
