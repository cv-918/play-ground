#pragma once

#include "GameObjectBase.h"

class TownPlayer final
	: public GameObjectBase
	, public ICollidable
{
	public:
	explicit TownPlayer(const PlayableCharacterJsonInfo* _info) : info_(_info) {}
	~TownPlayer() override;
	_bool Initialize() override;
	_int Update(_double _delta_time) override;
	_int LateUpdate(_double _delta_time) override;
	void OnDestroy() override;

	// ICollidable을(를) 통해 상속됨
	void OnCollisionEnter(Collider* _this, Collider* _other) override;
	void OnCollisionExit(Collider* _this, Collider* _other) override;
};

