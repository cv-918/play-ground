#include "framework.h"
#include "SkillBase.h"

_int SkillBase::Update(_double _delta_time)
{
    if (curr_cool_timer_ > 0.0)
        curr_cool_timer_ -= _delta_time;

    return UPDATE_CONTINUE;
}
