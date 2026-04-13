#pragma once

#include "SpriteAnimationSetData.h"

/**
 * 스프라이트 애니메이션 프레임/클립 생성 보조 유틸리티이다.
 * 현재 프로젝트의 GraphicResourceManager를 이용해
 * 단일 이미지 프레임과 시퀀스 클립을 생성한다.
 */
namespace SpriteAnimationBuilder
{
	/**
	 * 단일 이미지 한 장을 사용하는 프레임을 생성한다.
	 */
	SpriteAnimationFrameData MakeSingleSpriteFrame(
		const std::wstring& _path,
		_float _duration,
		SpritePivotMode _pivot_mode = SpritePivotMode::BottomCenter,
		_byte _alpha_threshold = 8);

	/**
	 * 경로에서 마지막 디렉터리까지만 잘라낸다.
	 * 예:
	 * "A/B/C/Idle_001.png" -> "A/B/C/"
	 */
	std::wstring ExtractDirectoryPath(const std::wstring& _path);

	/**
	 * 접두어 + 3자리 인덱스 + 확장자 형태의 시퀀스 경로를 생성한다.
	 * 예:
	 * directory = "A/B/"
	 * prefix = "Idle_"
	 * index = 1
	 * extension = ".png"
	 * 결과 = "A/B/Idle_001.png"
	 */
	std::wstring BuildSequenceFramePath(
		const std::wstring& _directory,
		const std::wstring& _prefix,
		_int _index,
		const std::wstring& _extension = L".png");

	/**
	 * 단일 이미지 시퀀스 기반 클립을 생성한다.
	 * 하나라도 실패하면 false를 반환한다.
	 */
	_bool BuildSequenceClip(
		SpriteAnimationClipData& _out_clip,
		const std::wstring& _clip_name,
		const std::wstring& _directory,
		const std::wstring& _prefix,
		_int _start_index,
		_int _end_index,
		_float _frame_duration,
		SpritePivotMode _pivot_mode = SpritePivotMode::BottomCenter,
		_byte _alpha_threshold = 8,
		const std::wstring& _extension = L".png");

	/**
	 * fps 기반으로 단일 이미지 시퀀스 클립을 생성한다.
	 * fps가 0 이하이면 실패한다.
	 */
	_bool BuildSequenceClipByFps(
		SpriteAnimationClipData& _out_clip,
		const std::wstring& _clip_name,
		const std::wstring& _directory,
		const std::wstring& _prefix,
		_int _start_index,
		_int _end_index,
		_float _fps,
		_bool _loop,
		SpritePivotMode _pivot_mode = SpritePivotMode::BottomCenter,
		_byte _alpha_threshold = 8,
		const std::wstring& _extension = L".png");
}