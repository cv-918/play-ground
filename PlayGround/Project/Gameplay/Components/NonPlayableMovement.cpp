#include "framework.h"
#include "NonPlayableMovement.h"

_bool NonPlayableMovement::Initialize()
{
	if (!__super::Initialize())
		return false;

	MAKE_INITIALIZED;
	return true;
}

void NonPlayableMovement::_ProcessOnstopped()
{
	// 자체적인 이동 외에 '밀림' 같은 내용이 필요하다면 여기에서 구현
}

void NonPlayableMovement::_ProcessOnDirectional()
{
	// 정해진 방향으로만 직선 이동
}

void NonPlayableMovement::_ProcessOnToTarget()
{
	// 타겟을 향해서 이동
	// 1. forward + 회전 속도 기반으로 이동
	// 2. 즉각적으로 방향을 바꿔서 무조건적인 추적 이동
}