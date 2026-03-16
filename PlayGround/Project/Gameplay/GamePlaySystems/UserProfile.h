#pragma once

#define _UserProfile UserProfile::Get()

class UserProfile final : public ISingleton<UserProfile>
{
public:
	void IncreaseCoins(const _uint _count);
	_bool SpendCoins(const _uint _count);

	// 유저 데이터 초기화
	void ClearUserData()
	{
		coin_count_ = 0;
		std::vector<std::pair<_uint, _uint>>().swap(acquired_node_ids_); // acquired_node_ids_ 벡터를 초기화하여 메모리 해제
	}

	// 유저 데이터 세팅
	void LoadUserData(const UserDataJsonInfo& _info)
	{
		coin_count_ = _info.coin_count_;
		acquired_node_ids_ = _info.acquired_node_ids_;
	}

	UserDataJsonInfo GetUserData() const
	{
		UserDataJsonInfo info;
		info.id_ = 0; // 필요 시 세이브 데이터 슬롯 id 할당
		info.coin_count_ = coin_count_;
		info.acquired_node_ids_ = acquired_node_ids_;
		return info;
	}

private:
	_uint coin_count_ = 0; // 플레이어가 획득한 코인 수를 나타내는 변수. 필요에 따라 게임 내에서 코인 획득과 소비를 관리하는 데 활용할 수 있습니다.
	std::vector<std::pair<_uint, _uint>> acquired_node_ids_; // 플레이어가 획득한 노드의 ID, 레벨 쌍. 필요에 따라 노드 레벨업 시스템이 구현되면 이 부분을 활용하여 플레이어가 획득한 노드와 그 레벨을 관리할 수 있습니다.
};

