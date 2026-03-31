#pragma once
#include "EngineSystems/Json/JsonDataManager.h"

//NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(
//	ParticleSetting,
//	id_,
//	shape,
//	shapeRadius,
//	arcAngle,
//	minLife, maxLife,
//	minSpeed, maxSpeed,
//	startScale,
//	sizeEase, endScale,
//	colorEase, startColor, endColor,
//	airResistance, gravityScale,
//	textureKey
//)

#define _ParticleDataMgr ParticleDataManager::Get()

class ParticleDataManager final
	: public ISingleton<ParticleDataManager>
	, public JsonDataManager<ParticleSetting>
{
};

