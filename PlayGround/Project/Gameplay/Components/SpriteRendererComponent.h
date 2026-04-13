#pragma once

#include "GamePlay/Components/ComponentBase.h"
#include "GamePlay/Components/Transform.h"
#include "GamePlay/Animation/SpriteAnimationTypes.h"

class GameObjectBase;

/**
 * 현재 스프라이트 렌더 명령을 보유하고 실제 렌더링을 수행하는 컴포넌트이다.
 */
class SpriteRendererComponent final : public ComponentBase
{
public:
	SpriteRendererComponent();
	virtual ~SpriteRendererComponent() override = default;

public:
	_bool Initialize() override;
	void Render(_double _delta_time) override;

public:
	/**
	 * 현재 렌더 명령을 설정한다.
	 */
	void SetRenderCommand(const SpriteRenderCommand& _render_command);

	/**
	 * 현재 렌더 명령을 반환한다.
	 */
	const SpriteRenderCommand& GetRenderCommand() const;

private:
	/**
	 * source rect 없이 전체 텍스처를 그린다.
	 */
	void _DrawWholeTexture(const _RectF& _dest_rect);

	/**
	 * source rect를 사용해 부분 텍스처를 그린다.
	 */
	void _DrawTextureRegion(const _RectF& _dest_rect);

private:
	/** Transform 캐시 */
	Transform* transform_ = nullptr;

	/** 현재 렌더 명령 */
	SpriteRenderCommand render_command_{};
};