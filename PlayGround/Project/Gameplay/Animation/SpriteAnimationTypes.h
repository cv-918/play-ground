#pragma once

#include <string>
#include <Base/Bases.h>
#include <Math/Geometry2D.h>
#include "EngineSystems/Render/GraphicResourceManager.h"

/**
 * 프레임이 어떤 방식으로 원본 이미지를 참조하는지 정의한다.
 */
enum class SpriteSourceType
{
	SingleTexture,
	AtlasRegion
};

/**
 * 하나의 프레임이 참조하는 원본 스프라이트 정보이다.
 * 멀티 스프라이트와 아틀라스를 공통 형태로 표현한다.
 */
struct SpriteSource
{
	/** 소스 타입 */
	SpriteSourceType type = SpriteSourceType::SingleTexture;

	/** SingleTexture일 때 사용할 텍스처 경로 */
	std::wstring texture_path;

	/** AtlasRegion일 때 사용할 아틀라스 경로 */
	std::wstring atlas_texture_path;

	/** AtlasRegion일 때 사용할 source rect */
	_RectF source_rect = _RectF(0.f, 0.f, 0.f, 0.f);

	/** 픽셀 단위 pivot */
	RenderPointF pivot = RenderPointF(0.f, 0.f);

	/** 원본 이미지 크기 */
	_float image_width = 0.f;
	_float image_height = 0.f;

	/** visible bounds 기준 크기 */
	_float visible_width = 1.f;
	_float visible_height = 1.f;

	/** 캐시된 텍스처 */
	const TextureResource* texture = nullptr;
};

/**
 * 단일 프레임 데이터이다.
 */
struct SpriteAnimationFrameData
{
	/** 스프라이트 원본 정보 */
	SpriteSource sprite;

	/** 프레임 유지 시간(초) */
	_float duration = 0.1f;

	/** 프레임 이벤트 이름 */
	std::wstring event_name;
};

/**
 * 원샷 애니메이션 종료 시 처리 정책이다.
 */
enum class SpriteAnimationEndPolicy
{
	KeepLastFrame,
	RewindToFirstFrame
};

/**
 * 애니메이터가 렌더러에 전달하는 현재 프레임 렌더 명령이다.
 */
struct SpriteRenderCommand
{
	const TextureResource* texture = nullptr;

	_bool use_source_rect = false;
	_RectF source_rect = _RectF(0.f, 0.f, 0.f, 0.f);

	_float pivot_x = 0.f;
	_float pivot_y = 0.f;

	_float image_width = 0.f;
	_float image_height = 0.f;

	_float visible_width = 1.f;
	_float visible_height = 1.f;

	_bool flip_x = false;
	_bool flip_y = false;

	_ubyte alpha = 255;
	_bool visible = true;
};