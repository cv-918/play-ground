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

struct WorldSpriteDrawMetrics
{
	_float pivot_x = 0.f;
	_float pivot_y = 0.f;
	_float image_width = 0.f;
	_float image_height = 0.f;
	_float visible_width = 1.f;
	_float visible_height = 1.f;
};

namespace SpriteRenderUtils
{
	inline WorldSpriteDrawMetrics MakeWorldSpriteDrawMetrics(const SpriteRenderCommand& _command)
	{
		WorldSpriteDrawMetrics metrics{};
		metrics.pivot_x = _command.pivot_x;
		metrics.pivot_y = _command.pivot_y;
		metrics.image_width = _command.image_width;
		metrics.image_height = _command.image_height;
		metrics.visible_width = std::max(1.f, _command.visible_width);
		metrics.visible_height = std::max(1.f, _command.visible_height);
		return metrics;
	}

	inline WorldSpriteDrawMetrics MakeWorldSpriteDrawMetrics(const SpriteResource& _sprite)
	{
		WorldSpriteDrawMetrics metrics{};
		metrics.pivot_x = _sprite.pivot.X;
		metrics.pivot_y = _sprite.pivot.Y;
		metrics.image_width = _sprite.image_rect.Width;
		metrics.image_height = _sprite.image_rect.Height;
		metrics.visible_width = s_float(std::max(1, _sprite.visible_bounds.Width()));
		metrics.visible_height = s_float(std::max(1, _sprite.visible_bounds.Height()));
		return metrics;
	}

	inline _RectF BuildWorldSpriteDestRect(
		const _Point& _screen_position,
		_float _world_width,
		const WorldSpriteDrawMetrics& _metrics,
		_float _resource_scale,
		_float _height_ratio = 0.6f)
	{
		const _float safe_world_width = std::max(0.f, _world_width);
		const _float safe_resource_scale = std::max(0.f, _resource_scale);
		const _float safe_visible_width = std::max(1.f, _metrics.visible_width);
		const _float safe_visible_height = std::max(1.f, _metrics.visible_height);
		const _float safe_height_ratio = std::max(0.f, _height_ratio);

		const _float scale_x = (safe_world_width * safe_resource_scale) / safe_visible_width;
		const _float scale_y = ((safe_world_width * safe_height_ratio) * safe_resource_scale) / safe_visible_height;

		const _float draw_width = _metrics.image_width * scale_x;
		const _float draw_height = _metrics.image_height * scale_y;
		const _float pivot_x = _metrics.pivot_x * scale_x;
		const _float pivot_y = _metrics.pivot_y * scale_y;

		return _RectF(
			s_float(_screen_position.x) - pivot_x,
			s_float(_screen_position.y) - pivot_y,
			s_float(_screen_position.x) - pivot_x + draw_width,
			s_float(_screen_position.y) - pivot_y + draw_height);
	}

	inline _float GetNaturalVisibleHeightRatio(const WorldSpriteDrawMetrics& _metrics)
	{
		const _float safe_visible_width = std::max(1.f, _metrics.visible_width);
		const _float safe_visible_height = std::max(1.f, _metrics.visible_height);
		return safe_visible_height / safe_visible_width;
	}
}
