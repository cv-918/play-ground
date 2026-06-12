#pragma once

#include "EngineSystems/Json/JsonDataManager.h"

struct OutGameLayoutRect
{
	_int left_ = 0;
	_int top_ = 0;
	_int right_ = 0;
	_int bottom_ = 0;

	_Rect ToRect() const { return _Rect(left_, top_, right_, bottom_); }
	void FromRect(const _Rect& _rect)
	{
		left_ = _rect.Left();
		top_ = _rect.Top();
		right_ = _rect.Right();
		bottom_ = _rect.Bottom();
	}

	_bool IsValid() const { return left_ < right_ && top_ < bottom_; }
};

struct OutGameLayoutInteractionArea
{
	_Vector2 center_offset_ = _Vector2::Zero();
	_float radius_x_ = 72.f;
	_float y_ratio_ = 0.45f;
};

struct OutGameLayoutNpcEntry
{
	std::string placement_id_;
	std::string npc_id_;
	_Vector3 position_ = _Vector3::Zero();
	_float visual_width_ = 80.f;
	std::string facing_;
	OutGameLayoutInteractionArea interaction_area_;
	_bool enabled_ = true;
};

struct OutGameLayoutSceneData
{
	std::string scene_id_ = "out_game";
	std::wstring background_path_ = L"Town_BG.png";
	OutGameLayoutRect player_walkable_rect_;
	std::vector<OutGameLayoutNpcEntry> npcs_;
};

#define _OutGameLayoutDataMgr OutGameLayoutDataManager::Get()

class OutGameLayoutDataManager final
	: public ISingleton<OutGameLayoutDataManager>
{
public:
	_bool Load(const std::string& _file_path);
	_bool Save(const std::string& _file_path) const;

	const OutGameLayoutSceneData& GetOutGameLayout() const { return out_game_layout_; }
	OutGameLayoutSceneData& EditOutGameLayout() { return out_game_layout_; }
	const std::string& LoadedFilePath() const { return loaded_file_path_; }

private:
	OutGameLayoutSceneData out_game_layout_;
	std::string loaded_file_path_;
};
