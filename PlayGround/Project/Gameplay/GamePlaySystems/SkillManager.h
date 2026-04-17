#pragma once

#include "GamePlaySystems/Skills/SkillRuntimeTypes.h"

#define _SkillMgr SkillManager::Get()

class SkillBase;
class GameObjectBase;

class SkillManager final
	: public ISingleton<SkillManager>
	, public IUpdatable
{
public:
	~SkillManager() override;
	_int Update(_double _delta_time) override;

	void EquipSkills(_uint _slot1_id, _uint _slot2_id);
	void EquipSkill(_uint _slot_idx, _uint _skill_id);
	void UnequipSkill(_uint _slot_idx);
	void ToggleSkillEquipState(_uint _slot_idx, _uint _skill_id);
	void UseSkill(_uint _slot_idx, GameObjectBase* _owner, const _Vector3& _dir);

	_float GetSkillCooldownRatio(_uint _slot_idx) const;
	SkillBase* GetEquippedSkill(_uint _slot_idx) const;

private:
	SkillBase* _CreateSkillInstance(_uint _id);

private:
	static constexpr _uint kMaxEquippedSkillCount = 2;
	SkillBase* equipped_skills_[kMaxEquippedSkillCount] = { nullptr, nullptr };
};
