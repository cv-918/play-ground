#pragma once

#include "GamePlay/Components/ComponentBase.h"
#include "GamePlay/Animation/SpriteAnimationSetData.h"

class SpriteRendererComponent;

/**
 * 스프라이트 애니메이션 재생 상태를 관리하고,
 * 현재 프레임을 렌더러에 반영하는 컴포넌트이다.
 */
class SpriteAnimatorComponent final : public ComponentBase
{
public:
	SpriteAnimatorComponent();
	virtual ~SpriteAnimatorComponent() override = default;

public:
	_bool Initialize() override;
	_int LateUpdate(_double _delta_time) override;

public:
	/**
	 * 렌더러를 연결한다.
	 */
	void SetRenderer(SpriteRendererComponent* _renderer);

	/**
	 * 애니메이션 세트를 설정한다.
	 */
	_bool SetAnimationSet(const SpriteAnimationSetData* _animation_set);

	/**
	 * 지정 클립을 재생한다.
	 */
	_bool Play(const std::wstring& _clip_name, _bool _restart = true);

	/**
	 * 현재 클립과 다를 때만 재생한다.
	 */
	_bool PlayIfNotCurrent(const std::wstring& _clip_name);

	/**
	 * 재생을 정지한다.
	 */
	void Stop();

	/**
	 * 일시정지한다.
	 */
	void Pause();

	/**
	 * 일시정지를 해제한다.
	 */
	void Resume();

	/**
	 * 런타임 재생 속도를 설정한다.
	 */
	void SetSpeed(_float _speed);

	/**
	 * 좌우 반전 여부를 설정한다.
	 */
	void SetFlipX(_bool _flip_x);

	/**
	 * 상하 반전 여부를 설정한다.
	 */
	void SetFlipY(_bool _flip_y);

private:
	/**
	 * 현재 클립을 설정하고 상태를 초기화한다.
	 */
	_bool _SetCurrentClip(const std::wstring& _clip_name);

	/**
	 * 재생 시간을 진행한다.
	 */
	void _Advance(_float _delta_time);

	/**
	 * 다음 프레임으로 진행한다.
	 */
	void _StepNextFrame();

	/**
	 * 현재 프레임이 유효한지 검사한다.
	 */
	_bool _HasValidCurrentFrame() const;

	/**
	 * 현재 프레임 이벤트를 처리한다.
	 */
	void _ProcessFrameEvent();

	/**
	 * 현재 프레임을 렌더러에 반영한다.
	 */
	void _PushCurrentFrameToRenderer();

private:
	/** 연결된 렌더러 */
	SpriteRendererComponent* renderer_ = nullptr;

	/** 애니메이션 세트 */
	const SpriteAnimationSetData* animation_set_ = nullptr;

	/** 현재 클립 */
	const SpriteAnimationClipData* current_clip_ = nullptr;

	/** 현재 클립 이름 */
	std::wstring current_clip_name_;

	/** 현재 프레임 인덱스 */
	_int current_frame_index_ = 0;

	/** 현재 프레임 경과 시간 */
	_float frame_elapsed_ = 0.f;

	/** 런타임 재생 속도 */
	_float speed_ = 1.f;

	/** 재생 중 여부 */
	_bool is_playing_ = false;

	/** 일시정지 여부 */
	_bool is_paused_ = false;

	/** 종료 여부 */
	_bool is_finished_ = false;

	/** 뒤집기 상태 */
	_bool flip_x_ = false;
	_bool flip_y_ = false;

	/** 마지막 이벤트 처리 프레임 */
	_int last_event_frame_index_ = -1;
};