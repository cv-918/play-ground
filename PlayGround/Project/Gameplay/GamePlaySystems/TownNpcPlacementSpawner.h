#pragma once

class ObjectManager;
class TownNpc;
struct TownNpcPlacementEntry;

class TownNpcPlacementSpawner final
{
public:
	std::vector<TownNpc*> Spawn(ObjectManager* _object_manager, const std::vector<TownNpcPlacementEntry>& _placements) const;
};
