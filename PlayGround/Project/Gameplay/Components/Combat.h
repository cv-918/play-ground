#pragma once
#include "ComponentBase.h"

class Status;
class Combat : public ComponentBase
{
public:
	explicit Combat(Status* const _status) : ComponentBase(ComponentType::Combat), status_(_status) {}

public:
	// 데미지 입히는 함수. 데미지 계산 로직이 포함되어 있음. Status 컴포넌트의 정보를 활용하여 최종 데미지를 계산하고 체력에서 감소시키는 역할을 함.
	_float GetDamage(_float _damage);

private:
	Status* const status_; // GameObject의 Status 컴포넌트에 대한 포인터. 데미지 계산 시 필요한 정보(예: 공격력, 방어력 등)를 가져오기 위해 사용
};
