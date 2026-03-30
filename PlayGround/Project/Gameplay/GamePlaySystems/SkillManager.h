#pragma once

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

	// 아웃게임에서 선택한 스킬 ID 2개를 세팅
	void EquipSkills(_uint _slot1_id, _uint _slot2_id);
	void EquipSkill(_uint _slot_idx, _uint _skill_id);
	void UnequipSkill(_uint _slot_idx);

	// 슬롯에 스킬이 이미 장착되어 있으면 제거, 그렇지 않으면 장착
	void ToggleSkillEquipState(_uint _slot_idx, _uint _skill_id);

	// 플레이어의 입력 시 호출
	void UseSkill(_uint _slot_idx, GameObjectBase* _owner, const _Vector3& _dir);

	_float GetSkillCooldownRatio(_uint _slot_idx) const;

	SkillBase* GetEquippedSkill(_uint _slot_idx) const;

private:
	SkillBase* _CreateSkillInstance(_uint _id); // 여기서 ID에 따라 new Skill_A() 등을 반환

private:
	SkillBase* equipped_skills_[2] = { nullptr, nullptr };
};

