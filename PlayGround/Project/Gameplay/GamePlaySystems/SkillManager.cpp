#include "framework.h"
#include "SkillManager.h"

#include "GamePlaySystems/Json/SkillJsonDataManager.h"
#include "GamePlaySystems/Skills/SkillBase.h"
#include "GamePlaySystems/Skills/Dust_DustGust.h"
#include "GamePlaySystems/Skills/Dust_AtmosphericCorrosion.h"
#include "GamePlaySystems/Skills/Dust_DrakSight.h"
#include "GameplaySystems/Skills/Dust_LintSatellite.h"

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
	// 기존에 장착된 스킬 인스턴스가 있다면 삭제
	for (auto* skill : equipped_skills_)
		SAFE_DELETE(skill);

	equipped_skills_[0] = _CreateSkillInstance(_slot1_id);
	equipped_skills_[1] = _CreateSkillInstance(_slot2_id);
}

void SkillManager::EquipSkill(_uint _slot_idx, _uint _skill_id)
{
	if (_slot_idx >= 2)
		return;

	// 기존에 장착된 스킬 인스턴스가 있다면 삭제
	SAFE_DELETE(equipped_skills_[_slot_idx]);
	equipped_skills_[_slot_idx] = _CreateSkillInstance(_skill_id);
}

void SkillManager::UnequipSkill(_uint _slot_idx)
{
	if (_slot_idx >= 2)
		return;

	SAFE_DELETE(equipped_skills_[_slot_idx]);
}

void SkillManager::ToggleSkillEquipState(_uint _slot_idx, _uint _skill_id)
{
	if (_slot_idx >= 2)
		return;

	if (equipped_skills_[_slot_idx] && equipped_skills_[_slot_idx]->GetInfo()->id_ == _skill_id)
	{
		// 이미 장착된 스킬과 같은 ID라면 제거
		UnequipSkill(_slot_idx);
	}
	else
	{
		// 그렇지 않다면 장착
		EquipSkill(_slot_idx, _skill_id);
	}
}

void SkillManager::UseSkill(_uint _slot_idx, GameObjectBase* _owner, const _Vector3& _dir)
{
	if (_slot_idx >= 2 || nullptr == equipped_skills_[_slot_idx])
		return;

	if (equipped_skills_[_slot_idx]->IsReady())
	{
		if (equipped_skills_[_slot_idx]->Execute(_owner, _dir)) {
			// 실행 성공 시 쿨타임 시작 등의 처리 가능
		}
	}
}

_float SkillManager::GetSkillCooldownRatio(_uint _slot_idx) const
{
	if (_slot_idx >= 2 || nullptr == equipped_skills_[_slot_idx])
		return 0.f;

	return equipped_skills_[_slot_idx]->GetCooldownRatio();
}

SkillBase* SkillManager::GetEquippedSkill(_uint _slot_idx) const
{
	if (_slot_idx >= 2)
		return nullptr;

	return equipped_skills_[_slot_idx];
}

SkillBase* SkillManager::_CreateSkillInstance(_uint _id)
{
	/*
		1) projectile_count_만큼 반복문을 돌린다.
		2) ObjectManager->CreateActor<Projectile>(...)을 호출한다.
		3) 생성된 투사체에 damage_ratio_, speed_, life_time_을 주입한다.
	*/

	const auto data = _SkillDataMgr.GetData(_id);
	if (!data)
	{
		_NULL_DETECTION_MSGBOX;
		return nullptr;
	}

	switch (data->id_)
	{
	case 0: return new Dust_DustGust(data);
	case 1: return new Dust_AtmosphericCorrosion(data);
	case 2: return new Dust_DrakSight(data);
	case 3: return new Dust_LintSatellite(data);
	}

	return nullptr;
}
