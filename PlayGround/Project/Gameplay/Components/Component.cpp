#include "framework.h"
#include "Component.h"

_bool Component::Initialize()
{
    return false;
}

_int Component::Update(_double _delta_time)
{
    return 0;
}

_int Component::LateUpdate(_double _delta_time)
{
    return 0;
}

void Component::Render(_double _delta_time)
{
}
