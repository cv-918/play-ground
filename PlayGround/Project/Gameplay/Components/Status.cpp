#include "framework.h"
#include "Status.h"

#include "Actors/GameObjectBase.h"

void Status::HP(const _float _hp)
{
	hp_ = _hp;

	if (0 >= hp_)
	{
		hp_ = 0;
		gameobject_->Destroy();
	}
}
