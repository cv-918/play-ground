#include "framework.h"
#include "VideoSettingsManager.h"

#include "EngineSystems/Render/ScreenSystem.h"

namespace
{
	constexpr _float UI_SCALES[] = { 0.75f, 1.0f, 1.25f, 1.5f };
	constexpr _uint TARGET_FPS_LIST[] = { 30, 60, 120, 144, 240 };

	void ReportVideoOptionSelfTest(_bool _passed, const char* _name)
	{
		char buffer[256] = {};
		sprintf_s(buffer, "[VideoOptionSelfTest] %s : %s\n", _name, _passed ? "PASS" : "FAIL");
		OutputDebugStringA(buffer);
	}

	_bool ExpectVideoOptionSelfTest(_bool _condition, const char* _name)
	{
		ReportVideoOptionSelfTest(_condition, _name);
		return _condition;
	}

	template<typename T, size_t N>
	_int FindIndex(const T(&arr)[N], const T& value)
	{
		for (_int i = 0; i < s_cast(_int, N); ++i)
		{
			if (arr[i] == value)
				return i;
		}

		return 0;
	}

	template<size_t N>
	_int WrapIndex(_int index)
	{
		const _int count = s_cast(_int, N);
		if (count <= 0)
			return 0;

		while (index < 0)
			index += count;
		while (index >= count)
			index -= count;

		return index;
	}
}

void VideoSettingsManager::BeginEdit()
{
	pending_ = applied_;
}

bool VideoSettingsManager::HasPendingChanges() const
{
	return pending_ != applied_;
}

bool VideoSettingsManager::Apply()
{
	if (_ScreenSystem.ApplyVideoMode(pending_))
	{
		applied_ = pending_;
		++applied_revision_;
		return true;
	}

	pending_ = applied_;
	return false;
}

void VideoSettingsManager::Cancel()
{
	pending_ = applied_;
}

void VideoSettingsManager::Reset()
{
	pending_ = CreateDefaultSettings();
}

void VideoSettingsManager::CyclePendingResolution(_int _direction)
{
	if (supported_resolutions_.empty())
		return;

	_int current_index = 0;
	for (_int i = 0; i < s_cast(_int, supported_resolutions_.size()); ++i)
	{
		if (supported_resolutions_[i] == pending_.resolution)
		{
			current_index = i;
			break;
		}
	}

	const _int next = current_index + (_direction >= 0 ? 1 : -1);
	const _int count = s_cast(_int, supported_resolutions_.size());
	_int wrapped = next;
	while (wrapped < 0)
		wrapped += count;
	while (wrapped >= count)
		wrapped -= count;

	pending_.resolution = supported_resolutions_[wrapped];
}

void VideoSettingsManager::CyclePendingWindowMode(_int _direction)
{
	constexpr WindowMode MODES[] = {
		WindowMode::Windowed,
		WindowMode::Borderless,
		WindowMode::BorderlessFullscreen,
	};

	const _int current = FindIndex(MODES, pending_.window_mode);
	const _int next = WrapIndex<_countof(MODES)>(current + (_direction >= 0 ? 1 : -1));
	pending_.window_mode = MODES[next];
}

void VideoSettingsManager::CyclePendingUiScale(_int _direction)
{
	_int current = 0;
	for (_int i = 0; i < s_cast(_int, _countof(UI_SCALES)); ++i)
	{
		if (std::abs(UI_SCALES[i] - pending_.ui_scale) < 0.0001f)
		{
			current = i;
			break;
		}
	}

	const _int next = WrapIndex<_countof(UI_SCALES)>(current + (_direction >= 0 ? 1 : -1));
	pending_.ui_scale = UI_SCALES[next];
}

void VideoSettingsManager::TogglePendingFrameLimit()
{
	pending_.frame_limit_enabled = !pending_.frame_limit_enabled;
}

void VideoSettingsManager::CyclePendingTargetFps(_int _direction)
{
	const _int current = FindIndex(TARGET_FPS_LIST, pending_.target_fps);
	const _int next = WrapIndex<_countof(TARGET_FPS_LIST)>(current + (_direction >= 0 ? 1 : -1));
	pending_.target_fps = TARGET_FPS_LIST[next];
}

_bool VideoSettingsManager::RunSelfTest()
{
	const VideoSettings original_applied = applied_;
	const VideoSettings original_pending = pending_;

	_bool ok = true;

	// [케이스 1] BeginEdit는 pending을 applied와 동일하게 맞춘다.
	BeginEdit();
	ok = ExpectVideoOptionSelfTest(pending_ == applied_, "BeginEdit.SyncPending") && ok;

	// [케이스 2] 변경 후 HasPendingChanges가 true, Cancel 후 false가 된다.
	CyclePendingResolution(1);
	ok = ExpectVideoOptionSelfTest(HasPendingChanges(), "PendingChanges.TrueAfterEdit") && ok;
	Cancel();
	ok = ExpectVideoOptionSelfTest(!HasPendingChanges(), "PendingChanges.FalseAfterCancel") && ok;

	// [케이스 3] Reset은 기본값으로 복구한다.
	BeginEdit();
	CyclePendingWindowMode(1);
	Reset();
	const VideoSettings defaults = CreateDefaultSettings();
	ok = ExpectVideoOptionSelfTest(pending_ == defaults, "Reset.ToDefault") && ok;

	// [케이스 4] 순환 변경 API가 실제 값을 변경한다.
	BeginEdit();
	const VideoSettings before_cycle = pending_;
	CyclePendingWindowMode(1);
	CyclePendingUiScale(1);
	CyclePendingTargetFps(1);
	ok = ExpectVideoOptionSelfTest(pending_.window_mode != before_cycle.window_mode, "Cycle.WindowMode") && ok;
	ok = ExpectVideoOptionSelfTest(std::abs(pending_.ui_scale - before_cycle.ui_scale) > 0.0001f, "Cycle.UiScale") && ok;
	ok = ExpectVideoOptionSelfTest(pending_.target_fps != before_cycle.target_fps, "Cycle.TargetFps") && ok;

	// [케이스 5] 프레임 제한 토글 API가 실제 값을 변경한다.
	const bool before_toggle = pending_.frame_limit_enabled;
	TogglePendingFrameLimit();
	ok = ExpectVideoOptionSelfTest(pending_.frame_limit_enabled != before_toggle, "Toggle.FrameLimit") && ok;

	applied_ = original_applied;
	pending_ = original_pending;

	ReportVideoOptionSelfTest(ok, "VideoSettingsManager.RunSelfTest");
	return ok;
}

VideoSettings VideoSettingsManager::CreateDefaultSettings()
{
	return VideoSettings{};
}

std::vector<Resolution> VideoSettingsManager::CreateSupportedResolutions()
{
	return {
		{ 1280, 720 },
		{ 1600, 900 },
		{ 1920, 1080 },
	};
}
