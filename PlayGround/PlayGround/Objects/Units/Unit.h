#pragma once
#include "../GameObject.h"
#include "../GlobalObjects/KeyManager.h"

/*
	모든 실제적 위치를 갖는 유닛(구조물X)
*/

class Unit abstract : public GameObject
{
	// 물리를 태운다면 물리 시스템에 등록, 해제하는 함수 같은 것이 여기에 오면 좋을 것 같다

	// 유닛이 가질 수 있는 요소들을 UnitComponent 로 계층화
	// move, combat etc

	// move 에 대한 기능 우선은 여기에 구현
public:
	_float MoveSpd() const { return move_spd; }
	void MoveSpd(const _float _spd) { move_spd = _spd; }

	_float RotateSpd() const { return rotate_spd; }
	void RotateSpd(const _float _spd) { rotate_spd = _spd; }

private:
	_float move_spd = 1.f;
	_float rotate_spd = 1.f;
	// 목적지까지 남은 거리가 프레임당 이동거리보다 작을 경우 목적지로 포지션 고정
};

