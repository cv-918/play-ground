#pragma once
#include "EngineSystems/Json/JsonDataManager.h"
#include "EngineSystems/Render/ParticleData.h"

#define _ParticleEmitterDataMgr ParticleEmitterDataManager::Get()

class ParticleEmitterDataManager final
	: public ISingleton<ParticleEmitterDataManager>
	, public JsonDataManager<ParticleEmitterSpec>
{
};
