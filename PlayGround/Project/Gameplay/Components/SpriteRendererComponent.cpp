#include "framework.h"
#include "SpriteRendererComponent.h"

#include "Actors/GameObjectBase.h"
#include "EngineSystems/Render/ScreenSystem.h"

SpriteRendererComponent::SpriteRendererComponent()
	: ComponentBase(ComponentType::SpriteRenderer)
{
}

/**
 * 렌더링에 필요한 Transform 캐시를 확보한다.
 */
_bool SpriteRendererComponent::Initialize()
{
	if (false == __super::Initialize())
		return false;

	if (gameobject_ == nullptr)
		return false;

	transform_ = gameobject_->GetTransform();
	if (transform_ == nullptr)
		return false;

	return true;
}

/**
 * 현재 렌더 명령을 기준으로 실제 스프라이트를 그린다.
 */
void SpriteRendererComponent::Render(_double _delta_time)
{
	(void)_delta_time;

	if (render_command_.visible == false)
		return;

	if (render_command_.texture == nullptr)
		return;

	if (transform_ == nullptr)
		return;

	const auto world_pos = transform_->Position();
	const auto screen_pos = _CameraMgr.WorldToScreen(world_pos);
	const auto metrics = SpriteRenderUtils::MakeWorldSpriteDrawMetrics(render_command_);
	const _RectF dest_rect = SpriteRenderUtils::BuildWorldSpriteDestRect(
		screen_pos,
		transform_->Scale().x,
		metrics,
		_ScreenSystem.GetWorldResourceScale());

	if (render_command_.use_source_rect == true)
	{
		_DrawTextureRegion(dest_rect);
		return;
	}

	_DrawWholeTexture(dest_rect);
}

/**
 * 현재 렌더 명령을 교체한다.
 */
void SpriteRendererComponent::SetRenderCommand(const SpriteRenderCommand& _render_command)
{
	render_command_ = _render_command;
}

/**
 * 현재 렌더 명령을 반환한다.
 */
const SpriteRenderCommand& SpriteRendererComponent::GetRenderCommand() const
{
	return render_command_;
}

void SpriteRendererComponent::SetWhiteFlashStrength(_float _strength)
{
	white_flash_strength_ = std::clamp(_strength, 0.f, 1.f);
}

/**
 * 전체 텍스처 기준으로 렌더링한다.
 */
void SpriteRendererComponent::_DrawWholeTexture(const _RectF& _dest_rect)
{
	const _RectF src_rect(
		0.f,
		0.f,
		s_float(render_command_.texture->Width()),
		s_float(render_command_.texture->Height()));

	if (white_flash_strength_ > 0.f)
	{
		_DrawFunc::DrawTextureWhiteFlash(
			render_command_.texture,
			_dest_rect,
			src_rect,
			render_command_.flip_x,
			render_command_.flip_y,
			white_flash_strength_,
			render_command_.alpha);
		return;
	}

	_DrawFunc::DrawTexture(
		render_command_.texture,
		_dest_rect,
		src_rect,
		render_command_.flip_x,
		render_command_.flip_y,
		render_command_.alpha);
}

/**
 * source rect 기준으로 부분 렌더링한다.
 */
void SpriteRendererComponent::_DrawTextureRegion(const _RectF& _dest_rect)
{
	if (white_flash_strength_ > 0.f)
	{
		_DrawFunc::DrawTextureWhiteFlash(
			render_command_.texture,
			_dest_rect,
			render_command_.source_rect,
			render_command_.flip_x,
			render_command_.flip_y,
			white_flash_strength_,
			render_command_.alpha);
		return;
	}

	_DrawFunc::DrawTexture(
		render_command_.texture,
		_dest_rect,
		render_command_.source_rect,
		render_command_.flip_x,
		render_command_.flip_y,
		render_command_.alpha);
}
