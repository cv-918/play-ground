#include "framework.h"
#include "Status.h"

#include "Actors/GameObjectBase.h"

void Status::SetCurrentHp(const _float _hp)
{
	current_hp_ = _hp;

	if (0 >= current_hp_)
	{
		current_hp_ = 0;
		is_dead_ = true;

		gameobject_->ReserveDestruction();
	}
}
