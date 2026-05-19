#include "framework.h"
#include "GameDataLoader.h"

#include "EngineSystems/Render/ParticleService.h"

#include "GamePlaySystems/Json/PlayableCharacterDataManager.h"
#include "GamePlaySystems/Json/SkillDefinitionDataManager.h"
#include "GamePlaySystems/Json/SkillJsonDataManager.h"
#include "GamePlaySystems/Json/EnemyDataManager.h"
#include "GamePlaySystems/Json/AttributeNodeDataManager.h"
#include "GamePlaySystems/Json/UserDataManager.h"
#include "GamePlaySystems/Json/StageJsonDataManager.h"
#include "GamePlaySystems/Json/ParticleDataManager.h"
#include "GamePlaySystems/Json/ParticleEmitterDataManager.h"
#include "GamePlaySystems/Json/ParticleEventSetDataManager.h"
#include "GamePlaySystems/Json/DialogueJsonDataManager.h"
#include "GamePlaySystems/Json/TownNpcPlacementDataManager.h"

namespace
{
	constexpr char kPlayableCharacterPath[] = "Data/PlayableCharacter.json";
	constexpr char kDialoguePath[] = "Data/dialogue_all_samples.json";
	constexpr char kSkillPath[] = "Data/Skill.json";
	constexpr char kParticlePath[] = "Data/Particle.json";
	constexpr char kParticleEmitterPath[] = "Data/ParticleEmitter.json";
	constexpr char kParticleEventSetPath[] = "Data/ParticleEventSet.json";
	constexpr char kEnemyPath[] = "Data/Enemy.json";
	constexpr char kAttributeNodePath[] = "Data/AttributeNode.json";
	constexpr char kStagePath[] = "Data/Stage.json";
	constexpr char kSpawnPoolPath[] = "Data/SpawnPool.json";
	constexpr char kUserDataPath[] = "Data/UserData.json";
	constexpr char kTownNpcPlacementPath[] = "Data/TownNpcPlacement.json";
}

_bool GameDataLoader::LoadAll()
{
	return _LoadAllInternal(false);
}

_bool GameDataLoader::ReloadAll()
{
	return _LoadAllInternal(true);
}

_bool GameDataLoader::_LoadAllInternal(const _bool _clear_particle_runtime)
{
	if (_clear_particle_runtime)
		_ParticleService.ClearSceneState();

	if (!_CharacterDagaMgr.Load(kPlayableCharacterPath))
	{
		_DEBUG_MSGBOX(_T("Failed to load playable character data from JSON."));
		return false;
	}

	if (!_DialogueJsonDataMgr.Load(kDialoguePath))
	{
		_DEBUG_MSGBOX(_T("Failed to load dialogue data from JSON."));
		return false;
	}

	if (!_SkillDataMgr.Load(kSkillPath))
	{
		_DEBUG_MSGBOX(_T("Failed to load skill data from JSON."));
		return false;
	}

	if (!_SkillDefinitionDataMgr.Load(kSkillPath))
	{
		_DEBUG_MSGBOX(_T("Failed to load skill definition data from JSON."));
		return false;
	}

	if (!_ParticleDataMgr.Load(kParticlePath))
	{
		_DEBUG_MSGBOX(_T("Failed to load particle data from JSON."));
		return false;
	}

	if (!_ParticleEmitterDataMgr.Load(kParticleEmitterPath))
	{
		_DEBUG_MSGBOX(_T("Failed to load particle emitter data from JSON."));
		return false;
	}

	if (!_ParticleEventSetDataMgr.Load(kParticleEventSetPath))
	{
		_DEBUG_MSGBOX(_T("Failed to load particle event set data from JSON."));
		return false;
	}

	if (!_EnemyDataMgr.Load(kEnemyPath))
	{
		_DEBUG_MSGBOX(_T("Failed to load enemy data from JSON."));
		return false;
	}

	if (!_AttributeNodeDataMgr.Load(kAttributeNodePath))
	{
		_DEBUG_MSGBOX(_T("Failed to load attribute node data from JSON."));
		return false;
	}

	if (!_StageDataMgr.Load(kStagePath, kSpawnPoolPath))
	{
		_DEBUG_MSGBOX(_T("Failed to load stage data from JSON."));
		return false;
	}

	if (!_UserDataMgr.Load(kUserDataPath))
	{
		_DEBUG_MSGBOX(_T("Failed to load user data from JSON."));
		return false;
	}

	if (!_TownNpcPlacementDataMgr.Load(kTownNpcPlacementPath))
	{
		_SYSTEM_LOG_ERROR(L"Failed to load town npc placement data from JSON. path: %s", _UtilFunc::ToWString(kTownNpcPlacementPath).c_str());
#ifdef _DEBUG
		_DEBUG_MSGBOX(_T("Failed to load town npc placement data from JSON."));
#endif
	}

	return true;
}
