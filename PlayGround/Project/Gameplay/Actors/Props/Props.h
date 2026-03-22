#pragma once
#include "../GameObjectBase.h"

/*
	Props 를 마그넷 아이템들로 정의할 것이라면
	여기에 그 로직들을 몰아둬야 한다.

	아직은 이 부분을 확정하기가 애매하니 일단은 Dust 클래스에 구현
*/

class Props abstract : public GameObjectBase
{
public:
	explicit Props(PropsType _type) : type_(_type) {}

public:
	void ChangeState(PropsState _state);

protected:
	PropsType type_ = PropsType::Undefined;

	PropsState state_ = PropsState::Undefined;
};

