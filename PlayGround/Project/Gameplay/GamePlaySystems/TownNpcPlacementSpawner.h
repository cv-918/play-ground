#pragma once

class ObjectManager;
class TownNpc;
struct TownNpcPlacementEntry;

class TownNpcPlacementSpawner final
{
public:
	std::vector<TownNpc*> Spawn(ObjectManager* _object_manager, const std::vector<TownNpcPlacementEntry>& _placements, const _Rect& _target_area) const;
	void ApplyPositions(const std::vector<TownNpc*>& _npcs, const std::vector<TownNpcPlacementEntry>& _placements, const _Rect& _target_area) const;

private:
	_Vector3 _ResolvePosition(const _Vector3& _authored_position, const _Rect& _target_area) const;
};
