#pragma once

#include "Actors/GameObjectBase.h"

/*
	모든 실제적 위치를 갖는 유닛(구조물X)
*/

enum class UnitDefaultColliderId
{
	Body = 0,
	Attack,
	ColCount,
};

#include "Gameplay/Scenes/GamePlayScene.h"

#include "Components/SphereCollider.h"
#include "Components/RectCollider.h"
#include "Components/Status.h"
#include "Components/Combat.h"

#include "EngineSystems/Physics/CollisionManager.h"
#include "UI/UIProgressBar.h"

class Movement;

class Unit abstract
	: public GameObjectBase
	, public ICollidable
	, public IDamagable
{
protected:
	explicit Unit();

protected:
	_bool Initialize() override;

public:
	void SetPlayScene(GamePlayScene* _scene) { play_scene_ = _scene; }

	SphereCollider* GetDefaultCollider(const UnitDefaultColliderId _id) const
	{
		const auto idx = s_uint(_id);
		if (idx < 0 || idx >= default_colliders_.size())
			return nullptr;
		return default_colliders_[idx];
	}

	Movement* GetMovement() const { return movement_; }
	void SetNavMesh(const _Rect& _rt);

	Combat* GetCombat() const { return combat_; }
	Status* GetStatus() const { return status_; }

	void SetHPBar(UIProgressBar* _hp_bar, _float _offset);

protected:
	// 유닛이 속한 씬에 대한 포인터. 필요에 따라 유닛이 속한 씬의 정보나 기능을 참조할 때 사용할 수 있습니다.
	GamePlayScene* play_scene_ = nullptr;

	// 유닛이 기본적으로 갖는 콜라이더들. Body, Attack 등으로 구분해서 저장. 필요에 따라 BoxCollider 등 다른 타입의 콜라이더도 추가 가능
	std::vector<SphereCollider*> default_colliders_;

	// 유닛의 이동을 담당하는 컴포넌트. 플레이어의 경우 PlayableMovement, 몬스터의 경우 NonPlayableMovement 등으로 구분해서 구현할 수 있습니다.
	Movement* movement_ = nullptr;

	// 유닛의 공격과 방어를 담당하는 컴포넌트. 공격력, 방어력, HP 등의 스탯과 공격 패턴 등을 관리할 수 있습니다.
	Combat* combat_ = nullptr;

	// 유닛의 상태를 관리하는 컴포넌트. 체력, 마나, 버프/디버프 상태 등을 관리할 수 있습니다.
	Status* status_ = nullptr;

	// 유닛의 체력 게이지 UI를 관리하는 포인터. 필요에 따라 유닛의 체력 상태를 시각적으로 표현하기 위해 사용할 수 있습니다.
	UIProgressBar* hp_bar_ = nullptr;
	_float hp_bar_offset_y_ = -20.f; // 체력바가 유닛보다 약간 위에 표시되도록 하는 오프셋 값. 필요에 따라 조정 가능
};

