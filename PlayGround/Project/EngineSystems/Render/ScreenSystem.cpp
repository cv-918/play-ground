#include "framework.h"
#include "ScreenSystem.h"

#include "RenderChain.h"

namespace
{
	_float ComputeResolutionScale(const Resolution& _base_resolution, const Resolution& _window_resolution, _bool _use_cover_mode)
	{
		if (_base_resolution.width <= 0 || _base_resolution.height <= 0)
			return 1.f;

		if (_window_resolution.width <= 0 || _window_resolution.height <= 0)
			return 1.f;

		const _float scale_x = s_cast(_float, _window_resolution.width) / s_cast(_float, _base_resolution.width);
		const _float scale_y = s_cast(_float, _window_resolution.height) / s_cast(_float, _base_resolution.height);
		return _use_cover_mode ? std::max(scale_x, scale_y) : std::min(scale_x, scale_y);
	}

	bool TryGetCurrentMonitorResolution(Resolution& _out_resolution)
	{
		if (g_hwnd == nullptr)
			return false;

		HMONITOR monitor = MonitorFromWindow(g_hwnd, MONITOR_DEFAULTTONEAREST);
		if (monitor == nullptr)
			return false;

		MONITORINFO monitor_info = {};
		monitor_info.cbSize = sizeof(monitor_info);
		if (!GetMonitorInfo(monitor, &monitor_info))
			return false;

		const RECT& monitor_rect = monitor_info.rcMonitor;
		const _int width = monitor_rect.right - monitor_rect.left;
		const _int height = monitor_rect.bottom - monitor_rect.top;
		if (width <= 0 || height <= 0)
			return false;

		_out_resolution = Resolution{ width, height };
		return true;
	}

	LONG BuildWindowStyle(WindowMode _mode)
	{
		switch (_mode)
		{
		case WindowMode::BorderlessFullscreen:
		case WindowMode::Borderless:
			return WS_POPUP;
		case WindowMode::Windowed:
		default:
			return WS_OVERLAPPED | WS_CAPTION | WS_SYSMENU | WS_MINIMIZEBOX;
		}
	}
}

_float ScreenSystem::GetWorldResourceScale() const
{
	return _CalculateAuthoringScale(false);
}

_float ScreenSystem::GetBackgroundCoverScale() const
{
	return _CalculateAuthoringScale(true);
}

Resolution ScreenSystem::WindowResolution() const
{
	if (g_hwnd)
	{
		RECT client = {};
		if (GetClientRect(g_hwnd, &client))
		{
			const _int width = client.right - client.left;
			const _int height = client.bottom - client.top;
			if (width > 0 && height > 0)
				return Resolution{ width, height };
		}
	}

	if (g_screen_size.x > 0 && g_screen_size.y > 0)
		return Resolution{ g_screen_size.x, g_screen_size.y };

	return design_resolution_;
}

_float ScreenSystem::_CalculateAuthoringScale(_bool _use_cover_mode) const
{
	return ComputeResolutionScale(asset_authoring_resolution_, WindowResolution(), _use_cover_mode);
}

bool ScreenSystem::ApplyVideoMode(const VideoSettings& _settings)
{
	const WindowMode previous_mode = current_window_mode_;
	const Resolution previous_resolution = WindowResolution();

	Resolution target_resolution = _settings.resolution;
	if (_settings.window_mode == WindowMode::BorderlessFullscreen)
	{
		if (!TryGetCurrentMonitorResolution(target_resolution))
		{
			_SYSTEM_LOG_ERROR(L"ApplyVideoMode failed: monitor resolution query failed");
			return false;
		}
	}

	if (!ApplyWindowMode(_settings.window_mode, _settings.resolution))
	{
		_SYSTEM_LOG_ERROR(L"ApplyVideoMode failed: ApplyWindowMode failed");
		return false;
	}

	if (!ApplyResolution(target_resolution))
	{
		const bool rollback_mode_ok = ApplyWindowMode(previous_mode, previous_resolution);
		const bool rollback_resolution_ok = ApplyResolution(previous_resolution);
		if (!rollback_mode_ok || !rollback_resolution_ok)
		{
			_SYSTEM_LOG_ERROR(L"ApplyVideoMode rollback failed");
		}

		_SYSTEM_LOG_ERROR(L"ApplyVideoMode failed: ApplyResolution failed");
		return false;
	}

	return true;
}

bool ScreenSystem::ApplyResolution(const Resolution& _resolution)
{
	if (g_hwnd == nullptr)
	{
		_SYSTEM_LOG_ERROR(L"ApplyResolution failed: hwnd is null");
		return false;
	}

	Resolution target_resolution = _resolution;
	if (current_window_mode_ == WindowMode::BorderlessFullscreen)
	{
		if (!TryGetCurrentMonitorResolution(target_resolution))
		{
			_SYSTEM_LOG_ERROR(L"ApplyResolution failed: monitor resolution query failed");
			return false;
		}
	}
	else if (_resolution.width <= 0 || _resolution.height <= 0)
	{
		_SYSTEM_LOG_ERROR(L"ApplyResolution failed: invalid size (%d x %d)", _resolution.width, _resolution.height);
		return false;
	}

	if (!_ApplyWindowRect(target_resolution, current_window_mode_))
	{
		_SYSTEM_LOG_ERROR(L"ApplyResolution failed: SetWindowPos failed");
		return false;
	}

	if (!_RenderChain.ResizeBackBuffer(target_resolution.width, target_resolution.height))
	{
		_SYSTEM_LOG_ERROR(L"ApplyResolution failed: ResizeBackBuffer failed");
		return false;
	}

	return true;
}

bool ScreenSystem::ApplyWindowMode(WindowMode _mode, const Resolution& _target_resolution)
{
	if (g_hwnd == nullptr)
	{
		_SYSTEM_LOG_ERROR(L"ApplyWindowMode failed: hwnd is null");
		return false;
	}

	Resolution target_resolution = _target_resolution;
	if (_mode == WindowMode::BorderlessFullscreen)
	{
		if (!TryGetCurrentMonitorResolution(target_resolution))
		{
			_SYSTEM_LOG_ERROR(L"ApplyWindowMode failed: monitor resolution query failed");
			return false;
		}
	}
	else if (_target_resolution.width <= 0 || _target_resolution.height <= 0)
	{
		_SYSTEM_LOG_ERROR(L"ApplyWindowMode failed: invalid target size (%d x %d)", _target_resolution.width, _target_resolution.height);
		return false;
	}

	const LONG previous_style = GetWindowLong(g_hwnd, GWL_STYLE);
	const LONG style = BuildWindowStyle(_mode) | WS_VISIBLE;

	SetLastError(0);
	const LONG set_style_ret = SetWindowLong(g_hwnd, GWL_STYLE, style);
	if (set_style_ret == 0 && GetLastError() != 0)
	{
		_SYSTEM_LOG_ERROR(L"ApplyWindowMode failed: SetWindowLong failed (err=%lu)", GetLastError());
		return false;
	}

	if (!_ApplyWindowRect(target_resolution, _mode))
	{
		SetWindowLong(g_hwnd, GWL_STYLE, previous_style);
		SetWindowPos(g_hwnd, nullptr, 0, 0, 0, 0,
			SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED);

		_SYSTEM_LOG_ERROR(L"ApplyWindowMode failed: SetWindowPos failed (err=%lu)", GetLastError());
		return false;
	}

	current_window_mode_ = _mode;
	return true;
}

_bool ScreenSystem::_ApplyWindowRect(const Resolution& _resolution, WindowMode _mode) const
{
	if (_mode == WindowMode::BorderlessFullscreen)
	{
		HMONITOR monitor = MonitorFromWindow(g_hwnd, MONITOR_DEFAULTTONEAREST);
		MONITORINFO monitor_info = {};
		monitor_info.cbSize = sizeof(monitor_info);
		if (monitor == nullptr || !GetMonitorInfo(monitor, &monitor_info))
			return FALSE;

		const RECT& monitor_rect = monitor_info.rcMonitor;
		const _int width = monitor_rect.right - monitor_rect.left;
		const _int height = monitor_rect.bottom - monitor_rect.top;
		if (width <= 0 || height <= 0)
			return FALSE;

		return SetWindowPos(
			g_hwnd,
			nullptr,
			monitor_rect.left,
			monitor_rect.top,
			width,
			height,
			SWP_NOZORDER | SWP_FRAMECHANGED) != FALSE;
	}

	if (_mode == WindowMode::Borderless)
	{
		return SetWindowPos(
			g_hwnd,
			nullptr,
			0,
			0,
			_resolution.width,
			_resolution.height,
			SWP_NOZORDER | SWP_FRAMECHANGED) != FALSE;
	}

	RECT rect = { 0, 0, _resolution.width, _resolution.height };
	AdjustWindowRectEx(&rect, BuildWindowStyle(WindowMode::Windowed), FALSE, 0);

	const _int width = rect.right - rect.left;
	const _int height = rect.bottom - rect.top;

	return SetWindowPos(
		g_hwnd,
		nullptr,
		0,
		0,
		width,
		height,
		SWP_NOMOVE | SWP_NOZORDER | SWP_FRAMECHANGED) != FALSE;
}
