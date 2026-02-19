#include "framework.h"
#include "Movement.h"

_int Movement::Update(_double _delta_time)
{
	move_func_(_delta_time);
	return _int();
}

_int Movement::LateUpdate(_double _delta_time)
{
	return _int();
}

void Movement::_ProcessOnControl()
{
	// 입력에 의한 이동
	// 플레이어 캐릭터 외에 플레이어블 액터가 추가된다면 여기에서 구현
}

void Movement::_ProcessOnstopped()
{
	// 자체적인 이동 외에 '밀림' 같은 내용이 필요하다면 여기에서 구현
}

void Movement::_ProcessOnDirectional()
{
	// 정해진 방향으로만 직선 이동
}

void Movement::_ProcessOnToTarget()
{
	// 타겟을 향해서 이동
	// 1. forward + 회전 속도 기반으로 이동
	// 2. 즉각적으로 방향을 바꿔서 무조건적인 추적 이동
}
