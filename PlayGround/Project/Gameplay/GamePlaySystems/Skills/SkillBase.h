#pragma once

#include "Actors/GameObjectBase.h"
#include "Scenes/InGameScene.h"

class SkillBase abstract
	: public IUpdatable
{
public:
	explicit SkillBase(const SkillJsonInfo* _info) : info_(_info), curr_cool_timer_(0.0) {}
	virtual ~SkillBase() DEFAULT;

public:
	_int Update(_double _delta_time) override;

public:
	_bool IsReady() const { return curr_cool_timer_ <= 0.0; }
	_float GetCooldownRatio() const { return info_->cooldown_ > 0.0 ? s_float(curr_cool_timer_ / info_->cooldown_) : 0.f; }

	// 실행 성공 시 true 반환 (쿨타임 리셋용)
	virtual _bool Execute(GameObjectBase* _owner, const _Vector3& _direction) PURE;

protected:
	void _ResetCoolTime() { curr_cool_timer_ = info_->cooldown_; }

protected:
	const SkillJsonInfo* info_;
	_double curr_cool_timer_;
};