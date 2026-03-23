#pragma once

#define _UserProfile UserProfile::Get()

class UserProfile final : public ISingleton<UserProfile>
{
public:
	// --- 유저 데이터 관련 ---
	void ResetUserData();
	void StoreUserData(const UserDataJsonInfo& _info);

	UserDataJsonInfo GetUserData() const;

	// --- 코인 관련 ---
	void IncreaseCoins(const _uint _count);
	_bool SpendCoins(const _uint _count);
	_uint GetCoinCount() const { return dust_count_; }

	// --- ---
	_uint GetExperience() const { return experience_; }

	// --- 어트리뷰트 관련 ---
	void UpdateAttributeStat();
	void NodeLevelUp(const _uint node_id);

	const AttributeStat& GetAttributeStat() const { return attribute_stat_; }

	NodeState GetNodeState(const AttributeNodeJsonInfo* _info) const;
	_uint GetNodeLevel(const _uint node_id) const;

	// --- 스테이지 관련 ---
	void ApplyRunSessionResult(const RunSessionResult& _result);
	_uint GetStageProgress() const { return stage_progress_; }
	
private:
	// 플레이어가 획득한 코인 수를 나타내는 변수. 필요에 따라 게임 내에서 코인 획득과 소비를 관리하는 데 활용할 수 있습니다.
	_uint dust_count_ = 0;

	// 플레이어가 획득한 총 경험치. 필요에 따라 경험치 시스템이 구현되면 이 부분을 활용하여 플레이어의 경험치를 관리할 수 있습니다.
	_uint experience_ = 0;

	// 플레이어가 잠금 해제한 캐릭터의 ID 리스트. 필요에 따라 캐릭터 잠금 해제 시스템이 구현되면 이 부분을 활용하여 플레이어가 잠금 해제한 캐릭터를 관리할 수 있습니다.
	std::vector<_uint> unlocked_character_ids_;

	// 플레이어가 획득한 노드의 ID, 레벨 쌍. 필요에 따라 노드 레벨업 시스템이 구현되면 이 부분을 활용하여 플레이어가 획득한 노드와 그 레벨을 관리할 수 있습니다.
	std::vector<std::pair<_uint, _uint>> acquired_node_ids_;

	// 플레이어의 현재 스테이지 진행 상황을 나타내는 변수. 필요에 따라 플레이어가 클리어한 스테이지 수나 현재 스테이지 번호 등을 관리하는 데 활용할 수 있습니다.
	_uint stage_progress_ = 0;

	// 플레이어의 어트리뷰트 수치를 관리하는 구조체. 필요에 따라 공격력, 체력, 이동 속도 등의 수치를 포함하여 플레이어의 능력치를 관리할 수 있습니다.
	AttributeStat attribute_stat_;
};

