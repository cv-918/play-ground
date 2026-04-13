#include "framework.h"
#include "SpriteAnimationBuilder.h"

#include "EngineSystems/Render/GraphicResourceManager.h"

/**
 * 단일 이미지 한 장을 사용하는 프레임을 생성한다.
 */
SpriteAnimationFrameData SpriteAnimationBuilder::MakeSingleSpriteFrame(
	const std::wstring& _path,
	_float _duration,
	SpritePivotMode _pivot_mode,
	_byte _alpha_threshold)
{
	SpriteAnimationFrameData frame{};
	frame.duration = _duration;
	frame.sprite.type = SpriteSourceType::SingleTexture;
	frame.sprite.texture_path = _path;

	const auto* sprite = _GraphicSourceMgr.GetSprite(_path, _pivot_mode, _alpha_threshold);
	if (sprite != nullptr && sprite->image != nullptr)
	{
		frame.sprite.texture = sprite->image;
		frame.sprite.image_width = sprite->image_rect.Width;
		frame.sprite.image_height = sprite->image_rect.Height;
		frame.sprite.visible_width = s_float(std::max(1, sprite->visible_bounds.Width()));
		frame.sprite.visible_height = s_float(std::max(1, sprite->visible_bounds.Height()));
		frame.sprite.pivot = sprite->pivot;
	}

	return frame;
}

/**
 * 경로에서 마지막 디렉터리까지만 잘라낸다.
 */
std::wstring SpriteAnimationBuilder::ExtractDirectoryPath(const std::wstring& _path)
{
	const size_t pos = _path.find_last_of(L"/\\");
	if (pos == std::wstring::npos)
		return L"";

	return _path.substr(0, pos + 1);
}

/**
 * 접두어 + 3자리 인덱스 + 확장자 형태의 시퀀스 경로를 생성한다.
 */
std::wstring SpriteAnimationBuilder::BuildSequenceFramePath(
	const std::wstring& _directory,
	const std::wstring& _prefix,
	_int _index,
	const std::wstring& _extension)
{
	wchar_t file_name[128] = {};
	swprintf_s(file_name, L"%s%03d%s", _prefix.c_str(), _index, _extension.c_str());
	return _directory + file_name;
}

/**
 * 단일 이미지 시퀀스 기반 클립을 생성한다.
 */
_bool SpriteAnimationBuilder::BuildSequenceClip(
	SpriteAnimationClipData& _out_clip,
	const std::wstring& _clip_name,
	const std::wstring& _directory,
	const std::wstring& _prefix,
	_int _start_index,
	_int _end_index,
	_float _frame_duration,
	SpritePivotMode _pivot_mode,
	_byte _alpha_threshold,
	const std::wstring& _extension)
{
	if (_directory.empty())
		return false;

	if (_clip_name.empty())
		return false;

	if (_start_index > _end_index)
		return false;

	if (_frame_duration <= 0.f)
		return false;

	SpriteAnimationClipData clip{};
	clip.clip_name = _clip_name;
	clip.loop = true;
	clip.default_speed = 1.0f;

	for (_int i = _start_index; i <= _end_index; ++i)
	{
		const std::wstring frame_path = BuildSequenceFramePath(_directory, _prefix, i, _extension);
		auto frame = MakeSingleSpriteFrame(frame_path, _frame_duration, _pivot_mode, _alpha_threshold);

		if (frame.sprite.texture == nullptr)
		{
			_SYSTEM_LOG_WARN(
				L"BuildSequenceClip failed. Clip: %s, FramePath: %s",
				_clip_name.c_str(),
				frame_path.c_str());
			return false;
		}

		clip.frames.push_back(frame);
	}

	_out_clip = clip;
	return true;
}

/**
 * fps 기반으로 단일 이미지 시퀀스 클립을 생성한다.
 */
_bool SpriteAnimationBuilder::BuildSequenceClipByFps(
	SpriteAnimationClipData& _out_clip,
	const std::wstring& _clip_name,
	const std::wstring& _directory,
	const std::wstring& _prefix,
	_int _start_index,
	_int _end_index,
	_float _fps,
	_bool _loop,
	SpritePivotMode _pivot_mode,
	_byte _alpha_threshold,
	const std::wstring& _extension)
{
	if (_fps <= 0.f)
		return false;

	const _float frame_duration = 1.f / _fps;

	SpriteAnimationClipData clip{};
	if (BuildSequenceClip(
		clip,
		_clip_name,
		_directory,
		_prefix,
		_start_index,
		_end_index,
		frame_duration,
		_pivot_mode,
		_alpha_threshold,
		_extension) == false)
	{
		return false;
	}

	clip.loop = _loop;
	_out_clip = clip;
	return true;
}