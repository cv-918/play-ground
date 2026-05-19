#include "framework.h"
#include "CharacterStationScene.h"

#include "EngineSystems/Debug/RunTimeDebuggingAssistant.h"
#include "EngineSystems/Render/GraphicResourceManager.h"
#include "EngineSystems/Render/ScreenSystem.h"
#include "GamePlay/Animation/SpriteAnimationBuilder.h"
#include "GamePlay/Animation/SpriteAnimationTypes.h"
#include "GamePlaySystems/GameDataLoader.h"
#include "GamePlaySystems/Json/EnemyDataManager.h"
#include "GamePlaySystems/Json/PlayableCharacterDataManager.h"

#include <iomanip>
#include <sstream>

namespace
{
	const std::wstring kCharacterWindowName = L"CharacterStation / Character";

	std::wstring FormatFloat(_double _value, _int _precision = 1)
	{
		std::wstringstream stream;
		stream << std::fixed << std::setprecision(_precision) << _value;
		return stream.str();
	}
}

_bool CharacterStationScene::Initialize()
{
	if (!__super::Initialize())
		return false;

	_RefreshSelection(true);
	_RefreshPreviewSprite();
	status_text_ = L"CharacterStation ready. Read-only preview slice.";
	status_color_ = Palette::White;

	MAKE_INITIALIZED;
	return true;
}

_int CharacterStationScene::Update(_double _delta_time)
{
	const auto ret = __super::Update(_delta_time);
	if (ret != UPDATE_CONTINUE)
		return ret;

	const _bool can_use_scene_shortcut = !_Assist.IsKeyboardCaptured();
	if (can_use_scene_shortcut && _InputMgr.Down(VK_ESCAPE))
	{
		_SceneMgr.ChangeScene(SceneType::Intro);
		return UPDATE_BREAK;
	}

	if (can_use_scene_shortcut && _InputMgr.Down(VK_F5))
		_ReloadData();

	return UPDATE_CONTINUE;
}

void CharacterStationScene::Render(_double _delta_time)
{
	const Resolution resolution = _ScreenSystem.WindowResolution();
	if (resolution.width > 0 && resolution.height > 0)
	{
		_DrawFunc::FillRectangle(
			_Rect{ _Point{ 0, 0 }, _Size{ resolution.width, resolution.height } },
			_Color(255, 16, 18, 23));
	}

	__super::Render(_delta_time);

	_DrawFunc::SetGlobalOffset(_Point::Zero());
	_DrawFunc::DrawString(_Point{ 24, 20 }, L"CharacterStation", Palette::White, 24.f, false);
	_DrawFunc::DrawString(_Point{ 24, 56 }, _GetSelectedSummary(), Palette::LightBlue, 15.f, false);
	_DrawFunc::DrawString(_Point{ 24, 82 }, L"Read-only preview. F5 Reload, Esc Intro.", Palette::White, 13.f, false);
	_DrawFunc::DrawString(_Point{ 24, 108 }, status_text_, status_color_, 14.f, false);

	_DrawPreview(resolution);
}

void CharacterStationScene::OnEnter()
{
	previous_debug_mode_ = _GameState.debug_mode_;
	_GameState.debug_mode_ = true;
	_RegisterDebugWindows();

	_SYSTEM_LOG_INFO(L"Entered CharacterStationScene.");
}

void CharacterStationScene::OnExit()
{
	_RemoveDebugWindows();
	_GameState.debug_mode_ = previous_debug_mode_;
}

void CharacterStationScene::_RegisterDebugWindows()
{
	if (debug_windows_registered_)
		_RemoveDebugWindows();

	_BuildCharacterWindow();
	debug_windows_registered_ = true;
}

void CharacterStationScene::_RemoveDebugWindows()
{
	if (!debug_windows_registered_)
		return;

	_Assist.RemoveWindow(kCharacterWindowName);
	debug_windows_registered_ = false;
}

void CharacterStationScene::_BuildCharacterWindow()
{
	_Assist.Separator(kCharacterWindowName, L"00_header", DweSeparatorData{ L"CharacterStation", true });

	DweDynamicTextData status_data;
	status_data.text_provider_ = [this]()
	{
		DweTextData data(status_text_.empty() ? L"Ready." : status_text_);
		data.color_ = status_color_;
		data.font_size_ = 12.f;
		return data;
	};
	_Assist.DynamicText(kCharacterWindowName, L"01_status", std::move(status_data));

	DweComboBoxData mode_data;
	mode_data.label_ = L"Mode";
	mode_data.option_provider_ = [this]() { return _GetModeLabels(); };
	mode_data.selected_index_getter_ = [this]() { return _GetSelectedModeIndex(); };
	mode_data.selected_index_setter_ = [this](_int _index) { _SetSelectedModeIndex(_index); };
	_Assist.ComboBox(kCharacterWindowName, L"02_mode", std::move(mode_data));

	DweSelectableListData character_list_data;
	character_list_data.label_ = L"Character";
	character_list_data.max_visible_items_ = 32;
	character_list_data.item_provider_ = [this]() { return _GetCharacterLabels(); };
	character_list_data.selected_index_getter_ = [this]() { return _GetSelectedCharacterIndex(); };
	character_list_data.selected_index_setter_ = [this](_int _index) { _SetSelectedCharacterIndex(_index); };
	_Assist.SelectableList(kCharacterWindowName, L"03_character_list", std::move(character_list_data));

	DweDynamicTextData summary_data;
	summary_data.text_provider_ = [this]()
	{
		DweTextData data(_GetSelectedSummary());
		data.color_ = Palette::Black;
		data.font_size_ = 12.f;
		return data;
	};
	_Assist.DynamicText(kCharacterWindowName, L"04_summary", std::move(summary_data));

	DweDynamicTextData resource_data;
	resource_data.text_provider_ = [this]()
	{
		DweTextData data(_GetPreviewResourceSummary());
		data.color_ = preview_sprite_ != nullptr ? Palette::Black : Palette::Red;
		data.font_size_ = 12.f;
		return data;
	};
	_Assist.DynamicText(kCharacterWindowName, L"05_resource", std::move(resource_data));

	DweDynamicTextData collider_data;
	collider_data.text_provider_ = [this]()
	{
		DweTextData data(
			L"Runtime body collider: rx=" + FormatFloat(_GetRuntimeBodyRadiusX()) +
			L", yRatio=" + FormatFloat(_GetRuntimeBodyYRatio()));
		data.color_ = Palette::Black;
		data.font_size_ = 12.f;
		return data;
	};
	_Assist.DynamicText(kCharacterWindowName, L"06_collider", std::move(collider_data));

	DweButtonRowData button_data;
	button_data.buttons_.push_back({ L"Reload", [this]() { _ReloadData(); } });
	_Assist.ButtonRow(kCharacterWindowName, L"07_buttons", std::move(button_data));
}

void CharacterStationScene::_ReloadData()
{
	if (!GameDataLoader::ReloadAll())
	{
		status_text_ = L"Reload failed. Check JSON syntax and logs.";
		status_color_ = Palette::Red;
		return;
	}

	_RefreshSelection(false);
	_RefreshPreviewSprite();
	status_text_ = L"Reload complete. Character data refreshed.";
	status_color_ = Palette::Green;
}

void CharacterStationScene::_RefreshSelection(_bool _force_first_valid)
{
	const auto playable_ids = _GetSortedPlayableIds();
	if (!playable_ids.empty())
	{
		const auto has_selected = std::find(playable_ids.begin(), playable_ids.end(), selected_playable_id_) != playable_ids.end();
		if (_force_first_valid || !has_selected)
			selected_playable_id_ = playable_ids.front();
	}
	else
	{
		selected_playable_id_ = 0;
	}

	const auto enemy_ids = _GetSortedEnemyIds();
	if (!enemy_ids.empty())
	{
		const auto has_selected = std::find(enemy_ids.begin(), enemy_ids.end(), selected_enemy_id_) != enemy_ids.end();
		if (_force_first_valid || !has_selected)
			selected_enemy_id_ = enemy_ids.front();
	}
	else
	{
		selected_enemy_id_ = 0;
	}
}

void CharacterStationScene::_RefreshPreviewSprite()
{
	preview_sprite_ = nullptr;
	preview_sprite_path_.clear();
	preview_sprite_source_.clear();

	const auto* unit_info = _GetSelectedUnitInfo();
	if (unit_info == nullptr)
		return;

	if (mode_ == CharacterStationMode::Playable)
	{
		preview_sprite_source_ = L"animation_clips_";
		preview_sprite_ = _TryLoadPlayableAnimationPreview(preview_sprite_path_);
		return;
	}

	const std::wstring image_path = _UtilFunc::ToWString(unit_info->image_path_);
	preview_sprite_source_ = L"legacy image_path_";
	preview_sprite_ = _TryLoadPreviewSprite(image_path);
	if (preview_sprite_ != nullptr)
	{
		preview_sprite_path_ = image_path;
		return;
	}
}

std::vector<_uint> CharacterStationScene::_GetSortedPlayableIds() const
{
	std::vector<_uint> ids;
	ids.reserve(_CharacterDagaMgr.GetTable().size());
	for (const auto& [id, data] : _CharacterDagaMgr.GetTable())
	{
		(void)data;
		ids.push_back(id);
	}

	std::sort(ids.begin(), ids.end());
	return ids;
}

std::vector<_uint> CharacterStationScene::_GetSortedEnemyIds() const
{
	std::vector<_uint> ids;
	ids.reserve(_EnemyDataMgr.GetTable().size());
	for (const auto& [id, data] : _EnemyDataMgr.GetTable())
	{
		(void)data;
		ids.push_back(id);
	}

	std::sort(ids.begin(), ids.end());
	return ids;
}

std::vector<std::wstring> CharacterStationScene::_GetModeLabels() const
{
	return { L"Playable", L"Enemy" };
}

std::vector<std::wstring> CharacterStationScene::_GetCharacterLabels() const
{
	std::vector<std::wstring> labels;

	if (mode_ == CharacterStationMode::Playable)
	{
		for (const auto id : _GetSortedPlayableIds())
		{
			const auto* data = _CharacterDagaMgr.GetData(id);
			if (data == nullptr)
				continue;

			labels.push_back(L"#" + std::to_wstring(data->id_) + L" " + _UtilFunc::ToWString(data->name_));
		}
	}
	else
	{
		for (const auto id : _GetSortedEnemyIds())
		{
			const auto* data = _EnemyDataMgr.GetData(id);
			if (data == nullptr)
				continue;

			labels.push_back(L"#" + std::to_wstring(data->id_) + L" " + _UtilFunc::ToWString(data->name_));
		}
	}

	if (labels.empty())
		labels.push_back(L"(No characters loaded)");

	return labels;
}

_int CharacterStationScene::_GetSelectedModeIndex() const
{
	return s_int(mode_);
}

void CharacterStationScene::_SetSelectedModeIndex(_int _index)
{
	const auto clamped = std::clamp(_index, 0, s_int(CharacterStationMode::Count) - 1);
	mode_ = s_cast(CharacterStationMode, clamped);
	_RefreshSelection(false);
	_RefreshPreviewSprite();
}

_int CharacterStationScene::_GetSelectedCharacterIndex() const
{
	const auto ids = (mode_ == CharacterStationMode::Playable)
		? _GetSortedPlayableIds()
		: _GetSortedEnemyIds();
	const auto selected_id = (mode_ == CharacterStationMode::Playable)
		? selected_playable_id_
		: selected_enemy_id_;

	const auto it = std::find(ids.begin(), ids.end(), selected_id);
	if (it == ids.end())
		return 0;

	return s_int(std::distance(ids.begin(), it));
}

void CharacterStationScene::_SetSelectedCharacterIndex(_int _index)
{
	const auto ids = (mode_ == CharacterStationMode::Playable)
		? _GetSortedPlayableIds()
		: _GetSortedEnemyIds();

	if (ids.empty())
		return;

	const auto clamped = std::clamp(_index, 0, s_int(ids.size()) - 1);
	if (mode_ == CharacterStationMode::Playable)
		selected_playable_id_ = ids[clamped];
	else
		selected_enemy_id_ = ids[clamped];

	_RefreshPreviewSprite();
}

const UnitJsonInfo* CharacterStationScene::_GetSelectedUnitInfo() const
{
	if (mode_ == CharacterStationMode::Playable)
		return _CharacterDagaMgr.GetData(selected_playable_id_);

	return _EnemyDataMgr.GetData(selected_enemy_id_);
}

std::wstring CharacterStationScene::_GetSelectedSummary() const
{
	const auto* unit_info = _GetSelectedUnitInfo();
	if (unit_info == nullptr)
		return L"No character selected.";

	const std::wstring mode_label = (mode_ == CharacterStationMode::Playable) ? L"Playable" : L"Enemy";
	return mode_label +
		L" #" + std::to_wstring(unit_info->id_) +
		L" " + _UtilFunc::ToWString(unit_info->name_) +
		L" | body=" + FormatFloat(unit_info->body_size_) +
		L" | preview=" + (preview_sprite_source_.empty() ? L"none" : preview_sprite_source_);
}

std::wstring CharacterStationScene::_GetPreviewResourceSummary() const
{
	if (preview_sprite_ != nullptr)
		return L"Preview resource (" + preview_sprite_source_ + L"): " + preview_sprite_path_;

	const auto* unit_info = _GetSelectedUnitInfo();
	if (unit_info == nullptr)
		return L"Preview resource: none";

	if (mode_ == CharacterStationMode::Playable)
		return L"Preview resource missing. animation_clips_ has no loadable first frame.";

	return L"Preview resource missing. legacy image_path_ is empty or not loadable.";
}

_float CharacterStationScene::_GetRuntimeBodyRadiusX() const
{
	const auto* unit_info = _GetSelectedUnitInfo();
	if (unit_info == nullptr)
		return 0.f;

	if (mode_ == CharacterStationMode::Playable)
		return kStagePlayerBodyRadiusX;

	return unit_info->body_size_;
}

_float CharacterStationScene::_GetRuntimeBodyYRatio() const
{
	return kDefaultColliderYRatio;
}

_float CharacterStationScene::_GetCurrentBodySize() const
{
	const auto* unit_info = _GetSelectedUnitInfo();
	return unit_info != nullptr ? unit_info->body_size_ : 0.f;
}

const SpriteResource* CharacterStationScene::_TryLoadPreviewSprite(const std::wstring& _path) const
{
	if (_path.empty())
		return nullptr;

	const auto* sprite = _GraphicSourceMgr.GetSprite(_path, SpritePivotMode::BottomCenter, 8);
	if (sprite == nullptr || sprite->image == nullptr)
		return nullptr;

	return sprite;
}

const SpriteResource* CharacterStationScene::_TryLoadPlayableAnimationPreview(std::wstring& _out_path) const
{
	_out_path.clear();

	const auto* info = _CharacterDagaMgr.GetData(selected_playable_id_);
	if (info == nullptr || info->animation_clips_.empty())
		return nullptr;

	for (const auto& clip_info : info->animation_clips_)
	{
		const auto frame_path = SpriteAnimationBuilder::BuildSequenceFramePath(
			_UtilFunc::ToWString(clip_info.directory_),
			_UtilFunc::ToWString(clip_info.prefix_),
			clip_info.start_index_);

		const auto* sprite = _TryLoadPreviewSprite(frame_path);
		if (sprite == nullptr)
			continue;

		_out_path = frame_path;
		return sprite;
	}

	return nullptr;
}

void CharacterStationScene::_DrawPreview(const Resolution& _resolution) const
{
	if (_resolution.width <= 0 || _resolution.height <= 0)
		return;

	const _Point center{
		s_int(std::round(_resolution.width * 0.5f)),
		s_int(std::round(_resolution.height * 0.52f))
	};

	_DrawFunc::DrawCircle(center, 4.f, Palette::Yellow, 1.5f);
	_DrawPreviewGuides(center);

	if (preview_sprite_ == nullptr || preview_sprite_->image == nullptr)
	{
		const auto body_radius = std::max(12.f, _GetCurrentBodySize() * 0.5f);
		_DrawFunc::FillCircle(center, body_radius, Palette::Charcoal);
		_DrawFunc::DrawCircle(center, body_radius, Palette::LightBlue, 2.f);
		_DrawFunc::DrawString(_Point{ center.x - 96, center.y - 8 }, L"No preview sprite", Palette::White, 14.f, false);
		return;
	}

	const auto metrics = SpriteRenderUtils::MakeWorldSpriteDrawMetrics(*preview_sprite_);
	const _RectF dest_rect = SpriteRenderUtils::BuildWorldSpriteDestRect(
		center,
		std::max(1.f, _GetCurrentBodySize()),
		metrics,
		_ScreenSystem.GetWorldResourceScale());

	const _RectF source_rect(
		preview_sprite_->image_rect.X,
		preview_sprite_->image_rect.Y,
		preview_sprite_->image_rect.X + preview_sprite_->image_rect.Width,
		preview_sprite_->image_rect.Y + preview_sprite_->image_rect.Height);

	_DrawFunc::DrawTexture(preview_sprite_->image, dest_rect, source_rect);
}

void CharacterStationScene::_DrawPreviewGuides(const _Point& _center) const
{
	const _float body_rx = _GetRuntimeBodyRadiusX();
	const _float body_ry = body_rx * _GetRuntimeBodyYRatio();
	if (body_rx > 0.f && body_ry > 0.f)
	{
		_DrawFunc::DrawEllipse(
			_RectF(
				s_float(_center.x) - body_rx,
				s_float(_center.y) - body_ry,
				s_float(_center.x) + body_rx,
				s_float(_center.y) + body_ry),
			Palette::Green,
			2.f);
	}

	const auto* unit_info = _GetSelectedUnitInfo();
	if (unit_info == nullptr)
		return;

	if (unit_info->attack_speed_ > 0.f)
	{
		_DrawFunc::DrawString(
			_Point{ _center.x + 32, _center.y + 28 },
			L"attackSpeed=" + FormatFloat(unit_info->attack_speed_, 2),
			Palette::White,
			12.f,
			false);
	}
}
