#include "framework.h"
#include "SpriteAnimatorComponent.h"
#include "SpriteRendererComponent.h"

SpriteAnimatorComponent::SpriteAnimatorComponent()
	: ComponentBase(ComponentType::SpriteAnimator)
{
}

/**
 * 기본 초기화.
 */
_bool SpriteAnimatorComponent::Initialize()
{
	if (false == __super::Initialize())
		return false;

	return true;
}

/**
 * LateUpdate 단계에서 프레임을 진행하고 렌더러에 반영한다.
 */
_int SpriteAnimatorComponent::LateUpdate(_double _delta_time)
{
	if ((is_playing_ == true) && (is_paused_ == false))
	{
		_Advance(s_cast(_float, _delta_time));
		_PushCurrentFrameToRenderer();
	}

	return UPDATE_CONTINUE;
}

/**
 * 렌더러를 연결한다.
 */
void SpriteAnimatorComponent::SetRenderer(SpriteRendererComponent* _renderer)
{
	renderer_ = _renderer;
	_PushCurrentFrameToRenderer();
}

/**
 * 애니메이션 세트를 설정한다.
 */
_bool SpriteAnimatorComponent::SetAnimationSet(const SpriteAnimationSetData* _animation_set)
{
	animation_set_ = _animation_set;
	current_clip_ = nullptr;
	current_clip_name_.clear();
	current_frame_index_ = 0;
	frame_elapsed_ = 0.f;
	speed_ = 1.f;
	is_playing_ = false;
	is_paused_ = false;
	is_finished_ = false;
	flip_x_ = false;
	flip_y_ = false;
	last_event_frame_index_ = -1;

	_PushCurrentFrameToRenderer();
	return (animation_set_ != nullptr);
}

/**
 * 지정 클립을 재생한다.
 */
_bool SpriteAnimatorComponent::Play(const std::wstring& _clip_name, _bool _restart)
{
	if (animation_set_ == nullptr)
		return false;

	if ((_restart == false) &&
		(current_clip_name_ == _clip_name) &&
		(is_finished_ == false))
	{
		return true;
	}

	return _SetCurrentClip(_clip_name);
}

/**
 * 현재 클립이 다를 때만 재생한다.
 */
_bool SpriteAnimatorComponent::PlayIfNotCurrent(const std::wstring& _clip_name)
{
	if ((current_clip_name_ == _clip_name) && (is_finished_ == false))
		return true;

	return Play(_clip_name, true);
}

/**
 * 재생을 정지한다.
 */
void SpriteAnimatorComponent::Stop()
{
	is_playing_ = false;
	is_paused_ = false;
	is_finished_ = true;
	_PushCurrentFrameToRenderer();
}

/**
 * 일시정지한다.
 */
void SpriteAnimatorComponent::Pause()
{
	if (is_playing_ == true)
		is_paused_ = true;
}

/**
 * 일시정지를 해제한다.
 */
void SpriteAnimatorComponent::Resume()
{
	if (current_clip_ != nullptr)
		is_paused_ = false;
}

/**
 * 런타임 재생 속도를 설정한다.
 */
void SpriteAnimatorComponent::SetSpeed(_float _speed)
{
	speed_ = std::max(0.f, _speed);
}

/**
 * 좌우 반전 여부를 설정한다.
 */
void SpriteAnimatorComponent::SetFlipX(_bool _flip_x)
{
	flip_x_ = _flip_x;
	_PushCurrentFrameToRenderer();
}

/**
 * 상하 반전 여부를 설정한다.
 */
void SpriteAnimatorComponent::SetFlipY(_bool _flip_y)
{
	flip_y_ = _flip_y;
	_PushCurrentFrameToRenderer();
}

/**
 * 현재 클립을 설정하고 재생 상태를 초기화한다.
 */
_bool SpriteAnimatorComponent::_SetCurrentClip(const std::wstring& _clip_name)
{
	if (animation_set_ == nullptr)
		return false;

	const auto iter = animation_set_->clips.find(_clip_name);
	if (iter == animation_set_->clips.end())
		return false;

	if (iter->second.frames.empty() == true)
		return false;

	current_clip_ = &iter->second;
	current_clip_name_ = _clip_name;
	current_frame_index_ = 0;
	frame_elapsed_ = 0.f;
	speed_ = 1.f;
	is_playing_ = true;
	is_paused_ = false;
	is_finished_ = false;
	last_event_frame_index_ = -1;

	_ProcessFrameEvent();
	_PushCurrentFrameToRenderer();
	return true;
}

/**
 * 재생 시간을 진행한다.
 */
void SpriteAnimatorComponent::_Advance(_float _delta_time)
{
	if (_HasValidCurrentFrame() == false)
		return;

	const auto clip_speed = current_clip_->default_speed * speed_;
	if (clip_speed <= 0.f)
		return;

	frame_elapsed_ += (_delta_time * clip_speed);

	while (_HasValidCurrentFrame() == true)
	{
		const auto& frame = current_clip_->frames[current_frame_index_];
		const auto safe_duration = std::max(0.0001f, frame.duration);

		if (frame_elapsed_ < safe_duration)
			break;

		frame_elapsed_ -= safe_duration;
		_StepNextFrame();

		if (is_playing_ == false)
			break;
	}
}

/**
 * 다음 프레임으로 진행한다.
 */
void SpriteAnimatorComponent::_StepNextFrame()
{
	if (_HasValidCurrentFrame() == false)
		return;

	++current_frame_index_;

	if (current_frame_index_ < s_int(current_clip_->frames.size()))
	{
		_ProcessFrameEvent();
		return;
	}

	if (current_clip_->loop == true)
	{
		current_frame_index_ = 0;
		_ProcessFrameEvent();
		return;
	}

	switch (current_clip_->end_policy)
	{
	case SpriteAnimationEndPolicy::KeepLastFrame:
		current_frame_index_ = s_int(current_clip_->frames.size()) - 1;
		break;

	case SpriteAnimationEndPolicy::RewindToFirstFrame:
		current_frame_index_ = 0;
		break;

	default:
		current_frame_index_ = s_int(current_clip_->frames.size()) - 1;
		break;
	}

	is_playing_ = false;
	is_finished_ = true;
	_ProcessFrameEvent();
}

/**
 * 현재 프레임이 유효한지 검사한다.
 */
_bool SpriteAnimatorComponent::_HasValidCurrentFrame() const
{
	if (current_clip_ == nullptr)
		return false;

	if (current_clip_->frames.empty() == true)
		return false;

	if (current_frame_index_ < 0)
		return false;

	if (current_frame_index_ >= s_int(current_clip_->frames.size()))
		return false;

	return true;
}

/**
 * 현재 프레임 이벤트를 처리한다.
 */
void SpriteAnimatorComponent::_ProcessFrameEvent()
{
	if (_HasValidCurrentFrame() == false)
		return;

	if (last_event_frame_index_ == current_frame_index_)
		return;

	const auto& frame = current_clip_->frames[current_frame_index_];
	if (frame.event_name.empty() == false)
	{
		// 실제 이벤트 시스템 연결 지점
	}

	last_event_frame_index_ = current_frame_index_;
}

/**
 * 현재 프레임을 렌더러에 반영한다.
 */
void SpriteAnimatorComponent::_PushCurrentFrameToRenderer()
{
	if (renderer_ == nullptr)
		return;

	SpriteRenderCommand cmd{};

	if (_HasValidCurrentFrame() == false)
	{
		cmd.visible = false;
		renderer_->SetRenderCommand(cmd);
		return;
	}

	const auto& frame = current_clip_->frames[current_frame_index_];
	const auto& sprite = frame.sprite;

	cmd.texture = sprite.texture;
	cmd.use_source_rect = (sprite.type == SpriteSourceType::AtlasRegion);
	cmd.source_rect = sprite.source_rect;
	cmd.pivot_x = sprite.pivot.X;
	cmd.pivot_y = sprite.pivot.Y;
	cmd.image_width = sprite.image_width;
	cmd.image_height = sprite.image_height;
	cmd.visible_width = std::max(1.f, sprite.visible_width);
	cmd.visible_height = std::max(1.f, sprite.visible_height);
	cmd.flip_x = flip_x_;
	cmd.flip_y = flip_y_;
	cmd.alpha = 255;
	cmd.visible = (sprite.texture != nullptr);

	renderer_->SetRenderCommand(cmd);
}