#pragma once

#include "EngineSystems/Json/JsonDataManager.h"

struct TownNpcPlacementEntry
{
	std::string placement_id_;
	std::string npc_id_;
	_Vector3 position_ = _Vector3::Zero();
	std::string facing_;
	_bool enabled_ = true;
};

struct TownNpcPlacementSceneData
{
	std::string scene_id_;
	std::vector<TownNpcPlacementEntry> placements_;
};

#define _TownNpcPlacementDataMgr TownNpcPlacementDataManager::Get()

class TownNpcPlacementDataManager final
	: public ISingleton<TownNpcPlacementDataManager>
{
public:
	_bool Load(const std::string& _file_path);

	const TownNpcPlacementSceneData* GetSceneData(const std::string& _scene_id) const;
	const std::vector<TownNpcPlacementEntry>& GetOutGamePlacements() const;

private:
	std::unordered_map<std::string, TownNpcPlacementSceneData> scene_table_;
	std::vector<TownNpcPlacementEntry> empty_placements_;
};
