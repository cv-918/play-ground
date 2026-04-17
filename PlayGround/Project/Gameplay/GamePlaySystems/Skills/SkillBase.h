#pragma once

#include "Actors/GameObjectBase.h"
#include "Scenes/InGameScene.h"
#include "SkillRuntimeTypes.h"

class SkillBase : public IUpdatable
{
public:
	explicit SkillBase(const SkillJsonInfo* _info);
	SkillBase(const SkillDefinition* _definition, const SkillJsonInfo* _info);
	virtual ~SkillBase() DEFAULT;

public:
	_int Update(_double _delta_time) override;

public:
	const SkillJsonInfo* GetInfo() const { return info_; }
	const SkillDefinition* GetDefinition() const { return definition_; }

	_bool IsReady() const;
	_bool IsCasting() const { return runtime_.phase_ == SkillRuntimePhase::Casting; }
	_float GetCooldownRatio() const;

	_double GetCurrentCooldown() const;
	_double GetMaxCooldown() const
	{
		if (definition_ && definition_->cooldown_sec_ > 0.0)
			return definition_->cooldown_sec_;
		return info_ ? info_->cooldown_ : 0.0;
	}

	virtual _bool Execute(GameObjectBase* _owner, const _Vector3& _direction);

protected:
	void _ResetCoolTime();
	void _BeginCooldown();
	_bool _ProcessGraphEvent(SkillGraphEvent _event);
	void _ExecuteNode(const SkillGraphNode& _node);
	void _SpawnExecution(const ExecutionEntitySpec& _spec);
	_Vector3 _ResolveAimDirection(GameObjectBase* _owner, const _Vector3& _direction) const;

protected:
	const SkillJsonInfo* info_ = nullptr;
	const SkillDefinition* definition_ = nullptr;
	SkillRuntimeState runtime_{};
};
