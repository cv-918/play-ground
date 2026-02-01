#include "framework.h"
#include "Random.h"

_bool Random::Initialize()
{
    Get().engine.seed(std::random_device{}());
    return true;
}
