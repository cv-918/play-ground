#include "Player.h"

#include "../../Components/Transform.h"

bool Player::Initialize()
{
    if (!__super::Initialize())
        return false;

	MoveSpd(1000.f);
    
    return true;
}

_int Player::Update(_double _delta_time)
{
    _int ret = 0;

    // 여기 컨트롤러 타입에 따른 다른 이동 처리 코드를
    // 일단 switch 로 구분해놓고 나중에 전략 또는 상태(객체) 패턴으로 변경
    ret = _ControllRoutine(_delta_time);
    if (0 != ret)
    {
        return ret;
    }

    return 0;
}

_int Player::Render(_double _delta_time)
{
	// 포지션을 중점으로 도형을 그린다
	// 어떤 외형을 갖게할 것인가 -> 컴포넌트
	// 회전은 그냥 Rectengle 로는 어차피 표현 못하고 정점 잡아서 라인투로 그려야함

	const auto pos = transform_->Position();
	const _int rt_size = 50;
	const auto half_size = rt_size >> 1;
	
	RECT rt = {
		pos.x - half_size,
		pos.y - half_size,
		pos.x + half_size,
		pos.y + half_size
	};

	Rectangle(back_dc_, rt.left, rt.top, rt.right, rt.bottom);
	

    return 0;
}

_int Player::_ControllRoutine(_double _delta_time)
{
	if (!transform_)
	{
		return -1;
	}

	const auto delta_time = s_float(_delta_time);

	switch (controller_type_)
	{
	case ControllerType::Direction:
	{
		auto mov_spd = MoveSpd();
		auto mov_dir = Vector3::Zero();
		if (_KeyMgr.Pressed('W'))
		{
			transform_->Translate(transform_->Forward2D() * mov_spd * delta_time);
		}
		else if (_KeyMgr.Pressed('S'))
		{
			transform_->Translate(transform_->Back2D() * mov_spd * delta_time);
		}

		bool rotate = false;
		auto rot_spd = RotateSpd();
		if (_KeyMgr.Pressed('A'))
		{
			rotate = true;
			rot_spd *= -1.f;
		}
		else if (_KeyMgr.Pressed('D'))
		{
			rotate = true;
		}
	
		if (rotate)
		{
			transform_->Rotate2D(rot_spd * delta_time);
		}

		return rotate || mov_dir == Vector3::Zero();
	}

	case ControllerType::Axis:
	{
		Vector3 move;
		if		(_KeyMgr.Pressed('W')) move.y -= 1.f;
		else if (_KeyMgr.Pressed('S')) move.y += 1.f;
		if		(_KeyMgr.Pressed('A')) move.x -= 1.f;
		else if (_KeyMgr.Pressed('D')) move.x += 1.f;

		if (move.LengthSq() > 0.f)
		{
			move.Normalize();
			transform_->Translate(move * MoveSpd() * delta_time);
		}

		return move.Length() != 0;
	}
	}
}
