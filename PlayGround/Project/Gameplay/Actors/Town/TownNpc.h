#pragma once

#include "../GameObjectBase.h"

class TownNpc final
	: public GameObjectBase
	, public IInteractable
	, public ICollidable
{
public:
	explicit TownNpc(const _Vector3& _position);
	virtual ~TownNpc() DEFAULT;

public:
	_bool Initialize() override;
	_int Update(_double _delta_time) override;

public:
	_bool CanInteract(GameObjectBase* _actor) override;
	void Interact(GameObjectBase* _actor) override;

public:
	void OnCollisionEnter(Collider* _this, Collider* _other) override;
	void OnCollisionExit(Collider* _this, Collider* _other) override;

private:
	_Vector3 position_ = _Vector3::Zero();
	Collider* interaction_collider_ = nullptr;
};