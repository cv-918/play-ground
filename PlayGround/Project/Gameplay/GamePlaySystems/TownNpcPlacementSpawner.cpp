#include "framework.h"
#include "TownNpcPlacementSpawner.h"

#include "GamePlaySystems/Json/OutGameLayoutDataManager.h"
#include "GamePlaySystems/ObjectManager.h"
#include "GamePlay/Actors/Town/TownNpc.h"
#include "EngineSystems/Render/ScreenSystem.h"

namespace
{
	std::wstring _ResolveTownNpcSpritePath(const std::string& _npc_id)
	{
		if (_npc_id == "elder")
			return Path::Character + L"Npcs/Oldman.png";

		if (_npc_id == "engineer")
			return Path::Character + L"Npcs/Engineer.png";

		if (_npc_id == "ring")
			return Path::Character + L"Npcs/Ring.png";

		return L"";
	}
}

std::vector<TownNpc*> TownNpcPlacementSpawner::Spawn(ObjectManager* _object_manager, const std::vector<OutGameLayoutNpcEntry>& _placements, const _Rect& _target_area) const
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
		create_info.position = _ResolvePosition(placement.position_, _target_area);
		create_info.sprite_path = _ResolveTownNpcSpritePath(placement.npc_id_);
		create_info.visual_width = placement.visual_width_;

		auto* npc = _object_manager->CreateActor<TownNpc>(create_info);
		if (npc == nullptr)
		{
			_SYSTEM_LOG_WARN(L"OutGameLayout NPC spawn failed. placement_id: %s", _UtilFunc::ToWString(placement.placement_id_).c_str());
			continue;
		}

		npc->SetName(_UtilFunc::ToWString(placement.placement_id_));
		_ApplyInteractionArea(npc, placement, _target_area);
		spawned_npcs.push_back(npc);
	}

	return spawned_npcs;
}

void TownNpcPlacementSpawner::ApplyPositions(const std::vector<TownNpc*>& _npcs, const std::vector<OutGameLayoutNpcEntry>& _placements, const _Rect& _target_area) const
{
	size_t npc_index = 0;
	for (const auto& placement : _placements)
	{
		if (!placement.enabled_)
			continue;

		if (npc_index >= _npcs.size())
			return;

		TownNpc* npc = _npcs[npc_index++];
		if (npc == nullptr || npc->GetTransform() == nullptr)
			continue;

		npc->GetTransform()->Position(_ResolvePosition(placement.position_, _target_area));
		_ApplyInteractionArea(npc, placement, _target_area);
	}
}

_Vector3 TownNpcPlacementSpawner::_ResolvePosition(const _Vector3& _authored_position, const _Rect& _target_area) const
{
	const Resolution design_resolution = _ScreenSystem.DesignResolution();
	if (design_resolution.width <= 0 || design_resolution.height <= 0)
		return _authored_position;

	if (_target_area.Width() <= 0 || _target_area.Height() <= 0)
		return _authored_position;

	const _float scale_x = s_float(_target_area.Width()) / s_float(design_resolution.width);
	const _float scale_y = s_float(_target_area.Height()) / s_float(design_resolution.height);

	return _Vector3(
		_target_area.Left_f() + _authored_position.x * scale_x,
		_target_area.Top_f() + _authored_position.y * scale_y,
		_authored_position.z);
}

_Vector2 TownNpcPlacementSpawner::_ResolveOffset(const _Vector2& _authored_offset, const _Rect& _target_area) const
{
	const Resolution design_resolution = _ScreenSystem.DesignResolution();
	if (design_resolution.width <= 0 || design_resolution.height <= 0)
		return _authored_offset;

	if (_target_area.Width() <= 0 || _target_area.Height() <= 0)
		return _authored_offset;

	const _float scale_x = s_float(_target_area.Width()) / s_float(design_resolution.width);
	const _float scale_y = s_float(_target_area.Height()) / s_float(design_resolution.height);

	return _Vector2(_authored_offset.x * scale_x, _authored_offset.y * scale_y);
}

void TownNpcPlacementSpawner::_ApplyInteractionArea(TownNpc* _npc, const OutGameLayoutNpcEntry& _placement, const _Rect& _target_area) const
{
	if (_npc == nullptr)
		return;

	const _Vector2 scaled_offset = _ResolveOffset(_placement.interaction_area_.center_offset_, _target_area);
	_npc->SetInteractionArea(
		scaled_offset,
		std::max(1.f, _placement.interaction_area_.radius_x_),
		std::max(0.01f, _placement.interaction_area_.y_ratio_));
}
