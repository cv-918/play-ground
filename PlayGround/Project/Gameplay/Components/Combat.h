#pragma once
#include "ComponentBase.h"

class Status;
class Combat : public ComponentBase
{
public:
	explicit Combat() : ComponentBase(ComponentType::Combat) {}

public:
	void GetDamage(_int _damage, Status* _status);
	// 데미지 입히는 함수. 데미지 계산 로직이 포함되어 있음. Status 컴포넌트의 정보를 활용하여 최종 데미지를 계산하고 체력에서 감소시키는 역할을 함.
};
