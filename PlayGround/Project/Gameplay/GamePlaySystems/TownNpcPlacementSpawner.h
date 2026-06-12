#pragma once

class ObjectManager;
class TownNpc;
struct OutGameLayoutNpcEntry;

class TownNpcPlacementSpawner final
{
public:
	std::vector<TownNpc*> Spawn(ObjectManager* _object_manager, const std::vector<OutGameLayoutNpcEntry>& _placements, const _Rect& _target_area) const;
	void ApplyPositions(const std::vector<TownNpc*>& _npcs, const std::vector<OutGameLayoutNpcEntry>& _placements, const _Rect& _target_area) const;

private:
	_Vector3 _ResolvePosition(const _Vector3& _authored_position, const _Rect& _target_area) const;
	_Vector2 _ResolveOffset(const _Vector2& _authored_offset, const _Rect& _target_area) const;
	void _ApplyInteractionArea(TownNpc* _npc, const OutGameLayoutNpcEntry& _placement, const _Rect& _target_area) const;
};
