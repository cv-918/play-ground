#include "framework.h"
#include "UserProfile.h"

#include "GamePlaySystems/Json/AttributeNodeDataManager.h"
#include "GamePlaySystems/SkillManager.h"

namespace
{
	_uint CalculateNodeLevelCost(const AttributeNodeJsonInfo* _data, const _uint _current_level)
	{
		if (nullptr == _data)
			return 0;

		return s_uint(_data->cost_ * (_data->cost_growth_rate_ * std::max(s_uint(1), _current_level)));
	}
}

void UserProfile::ResetUserData()
{
	dust_count_ = 0;
	experience_ = 0;
	std::vector<_uint>().swap(unlocked_character_ids_); // unlocked_character_ids_ 벡터를 초기화하여 메모리 해제
	std::vector<std::pair<_uint, _uint>>().swap(acquired_node_ids_); // acquired_node_ids_ 벡터를 초기화하여 메모리 해제
	equipped_skill_ids_.fill(-1);
	stage_progress_ = 0;
}

void UserProfile::StoreUserData(const UserDataJsonInfo& _info)
{
	const auto loaded_equipped_skill_ids = _info.equipped_skill_ids_;

	dust_count_ = _info.dust_count_;
	experience_ = _info.experience_;
	unlocked_character_ids_ = _info.unlocked_character_ids_;
	acquired_node_ids_ = _info.acquired_node_ids_;
	stage_progress_ = _info.stage_progress_;

	// 최초에 unlock 캐릭터가 아무것도 없을 경우 0(더스티)을 넣어준다
	// 여기서 하는게 맞는지 모르겠지만 일단 여기서
	if (unlocked_character_ids_.empty())
	{
		unlocked_character_ids_.push_back(s_uint(PlayableCharacterId::Dusty));
		_SYSTEM_LOG_INFO(_T("No unlocked characters found. Default character (Dusty) has been added to the unlocked character list."));
	}

	_SkillMgr.UnequipSkill(0);
	_SkillMgr.UnequipSkill(1);

	for (_uint slot_idx = 0; slot_idx < loaded_equipped_skill_ids.size(); ++slot_idx)
	{
		if (loaded_equipped_skill_ids[slot_idx] < 0)
			continue;

		_SkillMgr.EquipSkill(slot_idx, s_uint(loaded_equipped_skill_ids[slot_idx]));
	}

	UpdateAttributeStat(); // 유저 데이터를 저장한 후 어트리뷰트 수치를 업데이트하여 최신 상태로 유지
}

UserDataJsonInfo UserProfile::GetUserData() const
{
	UserDataJsonInfo info;
	info.id_ = 0; // 필요 시 세이브 데이터 슬롯 id 할당
	info.dust_count_ = dust_count_;
	info.experience_ = experience_;
	info.unlocked_character_ids_ = unlocked_character_ids_;
	info.acquired_node_ids_ = acquired_node_ids_;
	info.equipped_skill_ids_ = equipped_skill_ids_;
	info.stage_progress_ = stage_progress_;

	return info;
}

void UserProfile::SetEquippedSkillId(const _uint _slot_idx, const _int _skill_id)
{
	if (_slot_idx >= equipped_skill_ids_.size())
		return;

	equipped_skill_ids_[_slot_idx] = _skill_id;
}

_int UserProfile::GetEquippedSkillId(const _uint _slot_idx) const
{
	if (_slot_idx >= equipped_skill_ids_.size())
		return -1;

	return equipped_skill_ids_[_slot_idx];
}

void UserProfile::IncreaseCoins(const _uint _count)
{
	dust_count_ += _count;
	_SYSTEM_LOG_INFO(_T("Coins increased by %u. Current coin count: %u"), _count, dust_count_);

	// 코인 획득 시 추가적인 로직이 필요한 경우 여기에 작성 (예: UI 업데이트, 사운드 효과 재생 등)
}

_bool UserProfile::SpendCoins(const _uint _count)
{
	if (dust_count_ >= _count)
	{
		dust_count_ -= _count;
		// 코인 소비 시 추가적인 로직이 필요한 경우 여기에 작성 (예: UI 업데이트, 사운드 효과 재생 등)
		return true;
	}
	else
	{
		// 코인이 부족한 경우 처리 로직이 필요한 경우 여기에 작성 (예: 경고 메시지 표시 등)
		return false;
	}
}

void UserProfile::UpdateAttributeStat()
{
	// 모든 획득 노드를 순회하며 attribute_stat_ 수치를 누적 계산
	attribute_stat_ = AttributeStat(); // 기존 수치 초기화

	// acquired_node_ids_ 목록을 순회하면서 각 노드의 어트리뷰트 수치를 attribute_stat_ 에 반영
	for (const auto& pair : acquired_node_ids_)
	{
		const auto node_id = pair.first;
		const auto node_lv = pair.second;

		const auto attribute_data = _AttributeNodeDataMgr.GetData(node_id);
		if (nullptr == attribute_data)
		{
			_NULL_DETECTION_MSGBOX;
			continue;
		}

		// 노드 레벨에 따른 총 증가 수치 계산
		const auto total_value = node_lv * attribute_data->stat_value_;

		_float* target_stat = nullptr; // attribute_stat_의 해당 수치를 가리키는 포인터
		switch (attribute_data->stat_type_)
		{
		case AttributeType::Undefined:
			_DEBUG_MSGBOX(_T("Undefined AttributeType for node ID %u"), node_id);
			break;

		case AttributeType::SpecialAbility:
			// attribute_data->special_ability_id_값을 이용해서 스페셜 어빌리티 스크립트 참조
			// 이쪽 부분은 아무래도 특수 능력이다보니 일반화 시키기 어렵고 하나하나 꽂아줘야할 확률도 있다
			switch (attribute_data->special_ability_id_)
			{
			case SpecialAbilityId::Undefined:
				_DEBUG_MSGBOX(_T("Undefined SpecialAbilityId for node ID %u"), node_id);
				break;
			case SpecialAbilityId::DustCollect:
				attribute_stat_.special_ability_dust_collect_ = true;
				break;
			default:
				_DEBUG_MSGBOX(_T("Unexpected SpecialAbilityId %d for node ID %u"), s_int(attribute_data->special_ability_id_), node_id);
				break;
			}
			break;

		default:
			attribute_stat_.IncreaseStat(attribute_data->stat_type_, attribute_data->calc_type_, total_value);
			break;
		}
	}
}

void UserProfile::NodeLevelUp(const _uint node_id)
{
	const auto data = _AttributeNodeDataMgr.GetData(node_id);
	if (nullptr == data)
	{
		_NULL_DETECTION_MSGBOX;
		return;
	}

	auto it = std::find_if(acquired_node_ids_.begin(), acquired_node_ids_.end(),
		[&](const std::pair<_uint, _uint>& pair) { return pair.first == node_id; });
	if (it != acquired_node_ids_.end())
	{
		// 노드 데이터를 가져와서
		// 레벨업 가능 여부 판단 (예: 최대 레벨 체크 등). 필요에 따라 노드 레벨업 시 추가적인 로직을 작성할 수 있습니다.)
		const auto condition_level = it->second < data->max_lv_;

		const auto total_cost = CalculateNodeLevelCost(data, it->second);
		const auto condition_cost = dust_count_ >= total_cost;
		if (condition_level && condition_cost)
		{
			++it->second;
			dust_count_ -= total_cost;
		}

		_SYSTEM_LOG_INFO(_T("Node ID %u leveled up to level %u"), node_id, it->second);
	}
	else
	{
		// 노드를 처음 획득하는 경우 레벨 1로 추가
		const auto total_cost = CalculateNodeLevelCost(data, 0);
		if (dust_count_ < total_cost)
		{
			_SYSTEM_LOG_INFO(_T("Node ID %u failed to acquire due to insufficient coin. Current: %u, Need: %u"), node_id, dust_count_, total_cost);
			return;
		}

		dust_count_ -= total_cost;
		acquired_node_ids_.emplace_back(node_id, s_uint(1));
		_SYSTEM_LOG_INFO(_T("Node ID %u acquired at level 1"), node_id);
	}

	UpdateAttributeStat(); // 노드 레벨업 후 어트리뷰트 수치를 업데이트하여 최신 상태로 유지
}

void UserProfile::NodeLevelDown(const _uint node_id)
{
	const auto data = _AttributeNodeDataMgr.GetData(node_id);
	if (nullptr == data)
	{
		_NULL_DETECTION_MSGBOX;
		return;
	}

	auto it = std::find_if(acquired_node_ids_.begin(), acquired_node_ids_.end(),
		[&](const std::pair<_uint, _uint>& pair) { return pair.first == node_id; });
	if (it == acquired_node_ids_.end() || it->second == 0)
		return;

	const auto current_level = it->second;
	const auto refund_cost = CalculateNodeLevelCost(data, current_level - 1);

	if (current_level > 1)
	{
		--it->second;
		_SYSTEM_LOG_INFO(_T("Node ID %u leveled down to level %u"), node_id, it->second);
	}
	else
	{
		acquired_node_ids_.erase(it);
		_SYSTEM_LOG_INFO(_T("Node ID %u has been removed from acquired nodes"), node_id);
	}

	dust_count_ += refund_cost;
	UpdateAttributeStat();
}

NodeState UserProfile::GetNodeState(const AttributeNodeJsonInfo* _info) const
{
	NodeState state = NodeState::Undefined;
	if (nullptr == _info)
	{
		_NULL_DETECTION_MSGBOX;
		return state;
	}

	if (std::find(unlocked_character_ids_.begin(), unlocked_character_ids_.end(), _info->unlock_character_id_) == unlocked_character_ids_.end())
	{
		state = NodeState::Hidden; // 발견되지 않은 노드
	}
	else
	{
		if (_info->parent_node_id_ != -1)
		{
			auto it = std::find_if(acquired_node_ids_.begin(), acquired_node_ids_.end(),
				[&](const std::pair<_uint, _uint>& pair) { return pair.first == _info->parent_node_id_; });
			if (it != acquired_node_ids_.end() && it->second >= _info->required_parent_node_lv_)
			{
				state = NodeState::Unlocked; // 잠금 해제된 노드
			}
			else
			{
				state = NodeState::Locked; // 발견된 노드
			}
		}
		else
		{
			state = NodeState::Unlocked; // 부모 노드가 없는 경우 잠금 해제된 상태로 시작
		}
		auto it = std::find_if(acquired_node_ids_.begin(), acquired_node_ids_.end(),
			[&](const std::pair<_uint, _uint>& pair) { return pair.first == _info->id_; });
		if (it != acquired_node_ids_.end() && it->second > 0)
		{
			// 최대 레벨일 경우
			if (it->second >= _info->max_lv_)
			{
				state = NodeState::Mastered; // 마스터한 노드
			}
			else
			{
				state = NodeState::Acquired; // 습득한 노드
			}
		}
	}

	return state;
}

_uint UserProfile::GetNodeLevel(const _uint node_id) const
{
	auto it = std::find_if(acquired_node_ids_.begin(), acquired_node_ids_.end(),
		[&](const std::pair<_uint, _uint>& pair) { return pair.first == node_id; });

	if (it != acquired_node_ids_.end())
	{
		return it->second; // 노드 레벨 반환
	}
	else
	{
		return 0; // 노드를 획득하지 않은 경우 레벨 0으로 간주
	}
}

void UserProfile::ApplyRunSessionResult(const RunSessionResult& _result)
{
	const auto earned_coin_count = _result.earned_coin_count_;
	IncreaseCoins(_result.is_cleared_ ? earned_coin_count : earned_coin_count >> 1);

	experience_ += _result.gained_experience_;
}
