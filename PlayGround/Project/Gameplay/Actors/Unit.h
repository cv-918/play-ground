#pragma once

#include "Actors/GameObject.h"

/*
	모든 실제적 위치를 갖는 유닛(구조물X)
*/

class Unit abstract
	: public GameObject
{
	// 물리를 태운다면 물리 시스템에 등록, 해제하는 함수 같은 것이 여기에 오면 좋을 것 같다

	// 유닛이 가질 수 있는 요소들을 UnitComponent 로 계층화
	// move, combat etc

protected:
	void _RenderName();

	// move 에 대한 기능 우선은 여기에 구현
public:
	_float MoveSpd() const { return move_spd; }
	void MoveSpd(const _float _spd) { move_spd = _spd; }

	_float MoveSpdMax() const { return move_spd_max; }
	void MoveSpdMax(const _float _spd) { move_spd_max = _spd; }

	_float RotateSpd() const { return rotate_spd; }
	void RotateSpd(const _float _spd) { rotate_spd = _spd; }

private:
	_float move_spd = 1.f;
	_float move_spd_max = 1.f;
	_float rotate_spd = 1.f;

	// 목적지까지 남은 거리가 프레임당 이동거리보다 작을 경우 목적지로 포지션 고정
	// 목적지까지 이동하는 조작방식은 컨트롤 타입을 추가해서 구현

	// 유틸리티 RECT 클래스 만들기
	// 이 클래스는 정점 4개를 놓고 LineTo 로 사각형을 그리도록?
	// 그와 별개로 기본형 RECT 에 해당하는 형태도 갖고있는 것이 좋을 것 같다
};

