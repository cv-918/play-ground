#include "framework.h"
#include "SkillManager.h"

#include "Components/GameplayEffectController.h"
#include "GamePlaySystems/Json/SkillDefinitionDataManager.h"
#include "GamePlaySystems/Json/SkillJsonDataManager.h"
#include "GamePlaySystems/UserProfile.h"
#include "GamePlaySystems/Skills/SkillBase.h"

SkillManager::~SkillManager()
{
	for (auto* skill : equipped_skills_)
		SAFE_DELETE(skill);
}

_int SkillManager::Update(_double _delta_time)
{
	for (auto* skill : equipped_skills_)
	{
		if (skill)
			skill->Update(_delta_time);
	}

	return UPDATE_CONTINUE;
}

void SkillManager::EquipSkills(_uint _slot1_id, _uint _slot2_id)
{
	for (auto* skill : equipped_skills_)
		SAFE_DELETE(skill);

	_UserProfile.SetEquippedSkillId(0, -1);
	_UserProfile.SetEquippedSkillId(1, -1);

	equipped_skills_[0] = _CreateSkillInstance(_slot1_id);
	if (equipped_skills_[0] != nullptr && equipped_skills_[0]->GetInfo() != nullptr)
		_UserProfile.SetEquippedSkillId(0, s_int(equipped_skills_[0]->GetInfo()->id_));

	if (_slot1_id == _slot2_id)
	{
		equipped_skills_[1] = nullptr;
		return;
	}

	equipped_skills_[1] = _CreateSkillInstance(_slot2_id);
	if (equipped_skills_[1] != nullptr && equipped_skills_[1]->GetInfo() != nullptr)
		_UserProfile.SetEquippedSkillId(1, s_int(equipped_skills_[1]->GetInfo()->id_));
}

void SkillManager::EquipSkill(_uint _slot_idx, _uint _skill_id)
{
	if (_slot_idx >= kMaxEquippedSkillCount)
		return;

	for (_uint other_slot_idx = 0; other_slot_idx < kMaxEquippedSkillCount; ++other_slot_idx)
	{
		if (other_slot_idx == _slot_idx)
			continue;

		if (equipped_skills_[other_slot_idx] == nullptr || equipped_skills_[other_slot_idx]->GetInfo() == nullptr)
			continue;

		if (equipped_skills_[other_slot_idx]->GetInfo()->id_ == _skill_id)
			return;
	}

	SAFE_DELETE(equipped_skills_[_slot_idx]);
	equipped_skills_[_slot_idx] = _CreateSkillInstance(_skill_id);
	if (equipped_skills_[_slot_idx] != nullptr && equipped_skills_[_slot_idx]->GetInfo() != nullptr)
		_UserProfile.SetEquippedSkillId(_slot_idx, s_int(equipped_skills_[_slot_idx]->GetInfo()->id_));
	else
		_UserProfile.SetEquippedSkillId(_slot_idx, -1);
}

void SkillManager::UnequipSkill(_uint _slot_idx)
{
	if (_slot_idx >= kMaxEquippedSkillCount)
		return;

	SAFE_DELETE(equipped_skills_[_slot_idx]);
	_UserProfile.SetEquippedSkillId(_slot_idx, -1);
}

void SkillManager::ToggleSkillEquipState(_uint _slot_idx, _uint _skill_id)
{
	if (_slot_idx >= kMaxEquippedSkillCount)
		return;

	if (equipped_skills_[_slot_idx] && equipped_skills_[_slot_idx]->GetInfo()->id_ == _skill_id)
	{
		UnequipSkill(_slot_idx);
	}
	else
	{
		EquipSkill(_slot_idx, _skill_id);
	}
}

void SkillManager::UseSkill(_uint _slot_idx, GameObjectBase* _owner, const _Vector3& _dir)
{
	if (_slot_idx >= kMaxEquippedSkillCount || !_owner)
		return;

	auto* skill = equipped_skills_[_slot_idx];
	if (!skill || !skill->IsReady())
		return;

	const auto effect_controller = s_cast(
		GameplayEffectController*,
		_owner->GetComponent(ComponentType::GameplayEffectController));

	if (effect_controller && effect_controller->HasStateTag(GameplayStateTag::CastLocked))
		return;

	skill->Execute(_owner, _dir);
}

void SkillManager::ResetEquippedSkillsToReady()
{
	for (auto* skill : equipped_skills_)
	{
		if (skill)
			skill->ResetRuntimeToReady();
	}
}

_float SkillManager::GetSkillCooldownRatio(_uint _slot_idx) const
{
	if (_slot_idx >= kMaxEquippedSkillCount || !equipped_skills_[_slot_idx])
		return 0.f;

	return equipped_skills_[_slot_idx]->GetCooldownRatio();
}

SkillBase* SkillManager::GetEquippedSkill(_uint _slot_idx) const
{
	if (_slot_idx >= kMaxEquippedSkillCount)
		return nullptr;

	return equipped_skills_[_slot_idx];
}

SkillBase* SkillManager::_CreateSkillInstance(_uint _id)
{
	const auto data = _SkillDataMgr.GetData(_id);
	if (!data)
		return nullptr;

	const auto* definition = _SkillDefinitionDataMgr.GetData(_id);
	if (!definition)
		return nullptr;

	return new SkillBase(definition, data);
}
