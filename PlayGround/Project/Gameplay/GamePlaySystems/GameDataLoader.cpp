#include "framework.h"
#include "GameDataLoader.h"

#include <filesystem>

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
	constexpr char kTownNpcPlacementPath[] = "Data/TownNpcPlacement.json";

	enum class LoaderFailurePolicy
	{
		Required,
		Optional
	};

	std::filesystem::path GetExecutableDirectory()
	{
		wchar_t module_path[MAX_PATH] = {};
		const DWORD length = GetModuleFileNameW(nullptr, module_path, MAX_PATH);
		if (length == 0 || length >= MAX_PATH)
			return {};

		return std::filesystem::path(module_path).parent_path();
	}

	void AddPathCandidate(std::vector<std::filesystem::path>& _candidates, const std::filesystem::path& _candidate)
	{
		if (_candidate.empty())
			return;

		_candidates.push_back(_candidate);
	}

	void AddAncestorCandidates(std::vector<std::filesystem::path>& _candidates, std::filesystem::path _base, const std::filesystem::path& _requested_path)
	{
		while (!_base.empty())
		{
			AddPathCandidate(_candidates, _base / _requested_path);
			AddPathCandidate(_candidates, _base / "PlayGround" / _requested_path);

			const auto parent = _base.parent_path();
			if (parent == _base)
				break;

			_base = parent;
		}
	}

	std::string ResolvePatchableDataPath(const char* _relative_path)
	{
		const std::filesystem::path requested_path(_relative_path);
		if (requested_path.is_absolute())
			return requested_path.string();

		std::vector<std::filesystem::path> candidates;
		AddPathCandidate(candidates, std::filesystem::current_path() / requested_path);
		AddAncestorCandidates(candidates, std::filesystem::current_path(), requested_path);

		const auto executable_dir = GetExecutableDirectory();
		AddPathCandidate(candidates, executable_dir / requested_path);
		AddAncestorCandidates(candidates, executable_dir, requested_path);

		for (const auto& candidate : candidates)
		{
			std::error_code ec;
			if (std::filesystem::exists(candidate, ec) && !ec)
				return candidate.string();
		}

		return requested_path.string();
	}

	_bool HandleLoaderFailure(const char* _label, const std::string& _path, const LoaderFailurePolicy _policy)
	{
		const auto path_w = _UtilFunc::ToWString(_path);
		const auto label_w = _UtilFunc::ToWString(_label);

		switch (_policy)
		{
		case LoaderFailurePolicy::Required:
			_SYSTEM_LOG_ERROR(L"Required game data load failed. label: %s, path: %s", label_w.c_str(), path_w.c_str());
			_DEBUG_MSGBOX(_T("Failed to load required game data: %s"), label_w.c_str());
			return false;

		case LoaderFailurePolicy::Optional:
			_SYSTEM_LOG_WARN(L"Optional game data load failed. label: %s, path: %s", label_w.c_str(), path_w.c_str());
#ifdef _DEBUG
			_DEBUG_MSGBOX(_T("Failed to load optional game data: %s"), label_w.c_str());
#endif
			return true;
		}

		return false;
	}

	template <typename LoaderFunc>
	_bool LoadWithPolicy(const char* _label, const char* _relative_path, const LoaderFailurePolicy _policy, LoaderFunc _loader)
	{
		const std::string resolved_path = ResolvePatchableDataPath(_relative_path);
		if (_loader(resolved_path))
			return true;

		return HandleLoaderFailure(_label, resolved_path, _policy);
	}

	template <typename LoaderFunc>
	_bool LoadRequired(const char* _label, const char* _relative_path, LoaderFunc _loader)
	{
		return LoadWithPolicy(_label, _relative_path, LoaderFailurePolicy::Required, _loader);
	}

	template <typename LoaderFunc>
	_bool LoadOptional(const char* _label, const char* _relative_path, LoaderFunc _loader)
	{
		return LoadWithPolicy(_label, _relative_path, LoaderFailurePolicy::Optional, _loader);
	}
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

	if (!LoadRequired("PlayableCharacter", kPlayableCharacterPath, [](const std::string& path) { return _CharacterDagaMgr.Load(path); }))
		return false;

	if (!LoadRequired("Dialogue", kDialoguePath, [](const std::string& path) { return _DialogueJsonDataMgr.Load(path); }))
		return false;

	if (!LoadRequired("Skill", kSkillPath, [](const std::string& path) { return _SkillDataMgr.Load(path); }))
		return false;

	if (!LoadRequired("SkillDefinition", kSkillPath, [](const std::string& path) { return _SkillDefinitionDataMgr.Load(path); }))
		return false;

	if (!LoadRequired("Particle", kParticlePath, [](const std::string& path) { return _ParticleDataMgr.Load(path); }))
		return false;

	if (!LoadRequired("ParticleEmitter", kParticleEmitterPath, [](const std::string& path) { return _ParticleEmitterDataMgr.Load(path); }))
		return false;

	if (!LoadRequired("ParticleEventSet", kParticleEventSetPath, [](const std::string& path) { return _ParticleEventSetDataMgr.Load(path); }))
		return false;

	if (!LoadRequired("Enemy", kEnemyPath, [](const std::string& path) { return _EnemyDataMgr.Load(path); }))
		return false;

	if (!LoadRequired("AttributeNode", kAttributeNodePath, [](const std::string& path) { return _AttributeNodeDataMgr.Load(path); }))
		return false;

	const std::string resolved_stage_path = ResolvePatchableDataPath(kStagePath);
	const std::string resolved_spawn_pool_path = ResolvePatchableDataPath(kSpawnPoolPath);
	if (!_StageDataMgr.Load(resolved_stage_path, resolved_spawn_pool_path))
	{
		if (!HandleLoaderFailure("Stage", resolved_stage_path, LoaderFailurePolicy::Required))
			return false;
	}

	if (!_UserDataMgr.LoadUserData())
	{
		_DEBUG_MSGBOX(_T("Failed to load user data from JSON."));
		return false;
	}

	if (!LoadOptional("TownNpcPlacement", kTownNpcPlacementPath, [](const std::string& path) { return _TownNpcPlacementDataMgr.Load(path); }))
		return false;

	return true;
}
