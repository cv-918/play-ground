#include "Player.h"

bool Player::Initialize()
{
    if (!__super::Initialize())
        return false;
    
    return true;
}

int Player::Update(double _delta_time)
{
    _int ret = 0;
    if (_KeyMgr.Pressed('W'))
    {

    }
    else if (_KeyMgr.Pressed('W'))
    {

    }

    if (_KeyMgr.Pressed('W'))
    {

    }
    else if (_KeyMgr.Pressed('W'))
    {

    }

    return 0;
}

int Player::Render(double _delta_time)
{
    return 0;
}
