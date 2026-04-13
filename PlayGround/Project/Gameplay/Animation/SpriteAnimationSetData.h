#pragma once

#include "SpriteAnimationTypes.h"
#include <unordered_map>

/**
 * 하나의 애니메이션 클립 데이터이다.
 */
struct SpriteAnimationClipData
{
	/** 클립 이름 */
	std::wstring clip_name;

	/** 프레임 목록 */
	std::vector<SpriteAnimationFrameData> frames;

	/** 루프 여부 */
	_bool loop = true;

	/** 기본 재생 속도 */
	_float default_speed = 1.0f;

	/** 종료 정책 */
	SpriteAnimationEndPolicy end_policy = SpriteAnimationEndPolicy::KeepLastFrame;
};

/**
 * 하나의 오브젝트가 사용할 애니메이션 세트이다.
 */
struct SpriteAnimationSetData
{
	/** 세트 이름 */
	std::wstring set_name;

	/** 클립 이름 기준 맵 */
	std::unordered_map<std::wstring, SpriteAnimationClipData> clips;
};