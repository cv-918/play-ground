#include "framework.h"
#include "Enemy.h"

_bool Enemy::Initialize()
{
	if (!__super::Initialize())
		return false;

	// 무브먼트 컴포넌트 생성 및 등록
	movement_ = new NonPlayableMovement();
	RegisterComponent(movement_);

	return true;
}
