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


};

