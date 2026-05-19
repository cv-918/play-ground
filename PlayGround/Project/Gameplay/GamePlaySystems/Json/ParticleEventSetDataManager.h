#pragma once

#include "EngineSystems/Json/JsonDataManager.h"
#include "EngineSystems/Render/ParticleEventSetData.h"

#define _ParticleEventSetDataMgr ParticleEventSetDataManager::Get()

class ParticleEventSetDataManager final
	: public ISingleton<ParticleEventSetDataManager>
	, public JsonDataManager<ParticleEventSet>
{
public:
	_bool Save(const std::string& _file_path) override;
};
