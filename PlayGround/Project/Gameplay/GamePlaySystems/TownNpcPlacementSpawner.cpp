#include "framework.h"
#include "TownNpcPlacementSpawner.h"

#include "GamePlaySystems/Json/TownNpcPlacementDataManager.h"
#include "GamePlaySystems/ObjectManager.h"
#include "GamePlay/Actors/Town/TownNpc.h"

std::vector<TownNpc*> TownNpcPlacementSpawner::Spawn(ObjectManager* _object_manager, const std::vector<TownNpcPlacementEntry>& _placements) const
{
	std::vector<TownNpc*> spawned_npcs;
	if (_object_manager == nullptr)
		return spawned_npcs;

	spawned_npcs.reserve(_placements.size());

	for (const auto& placement : _placements)
	{
		if (!placement.enabled_)
			continue;

		TownNpc::CreateInfo create_info;
		create_info.position = placement.position_;

		auto* npc = _object_manager->CreateActor<TownNpc>(create_info);
		if (npc == nullptr)
		{
			_SYSTEM_LOG_WARN(L"TownNpcPlacement spawn failed. placement_id: %s", _UtilFunc::ToWString(placement.placement_id_).c_str());
			continue;
		}

		npc->SetName(_UtilFunc::ToWString(placement.placement_id_));
		spawned_npcs.push_back(npc);
	}

	return spawned_npcs;
}
