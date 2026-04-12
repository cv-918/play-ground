#pragma once

#include "EngineSystems/Render/VideoSettings.h"
#include <cstdint>

#define _VideoSettingsMgr VideoSettingsManager::Get()

class VideoSettingsManager final : public ISingleton<VideoSettingsManager>
{
public:
	const VideoSettings& Applied() const { return applied_; }
	const VideoSettings& Pending() const { return pending_; }
	const std::vector<Resolution>& SupportedResolutions() const { return supported_resolutions_; }
	uint64_t AppliedRevision() const { return applied_revision_; }

	void BeginEdit();
	bool HasPendingChanges() const;

	bool Apply();
	void Cancel();
	void Reset();

	void CyclePendingResolution(_int _direction);
	void CyclePendingWindowMode(_int _direction);
	void CyclePendingUiScale(_int _direction);

	_bool RunSelfTest();

private:
	static VideoSettings CreateDefaultSettings();
	static std::vector<Resolution> CreateSupportedResolutions();

private:
	VideoSettings applied_ = CreateDefaultSettings();
	VideoSettings pending_ = applied_;
	std::vector<Resolution> supported_resolutions_ = CreateSupportedResolutions();
	uint64_t applied_revision_ = 0;
};
