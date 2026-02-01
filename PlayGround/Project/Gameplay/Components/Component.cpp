#include "framework.h"
#include "Component.h"

_bool Component::Initialize()
{
    return false;
}

_int Component::Update(double _delta_time)
{
    return 0;
}

_int Component::LateUpdate(double _delta_time)
{
    return 0;
}

void Component::Render(double _delta_time)
{
}
