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
	constexpr char kPlayableCharacterPath[] = "Data/PlayableCharacter.json";
	constexpr char kEnemyPath[] = "Data/Enemy.json";
	const std::wstring kCharacterWindowName = L"CharacterStation / Character";

	std::wstring FormatFloat(_double _value, _int _precision = 1)
	{
		std::wstringstream stream;
		stream << std::fixed << std::setprecision(_precision) << _value;
		return stream.str();
	}

	_float ClampFloat(_float _value, _float _min, _float _max)
	{
		return std::clamp(_value, _min, _max);
	}
}

_bool CharacterStationScene::Initialize()
{
	if (!__super::Initialize())
		return false;

	_RefreshSelection(true);
	_RefreshPreviewSprite();
	status_text_ = L"CharacterStation ready. Edit through DebugAssistant windows.";
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

	if (can_use_scene_shortcut && _InputMgr.Down(VK_F9))
		_SaveCurrentModeData();

	_AdvancePreviewAnimation(_delta_time);

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
	_DrawFunc::DrawString(_Point{ 24, 82 }, L"Edit in DebugAssistant. F5 Reload, F9 Save Current, Esc Intro.", Palette::White, 13.f, false);
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

	auto add_float = [this](
		const std::wstring& _key,
		const std::wstring& _label,
		_float _min,
		_float _max,
		_float _step,
		_int _precision,
		std::function<_float()> _getter,
		std::function<void(_float)> _setter)
	{
		DweSliderFloatData data;
		data.label_ = _label;
		data.min_value_ = _min;
		data.max_value_ = _max;
		data.step_ = _step;
		data.precision_ = _precision;
		data.value_getter_ = std::move(_getter);
		data.value_setter_ = std::move(_setter);
		_Assist.SliderFloat(kCharacterWindowName, _key, std::move(data));
	};

	auto add_int = [this](
		const std::wstring& _key,
		const std::wstring& _label,
		_int _min,
		_int _max,
		_int _step,
		std::function<_int()> _getter,
		std::function<void(_int)> _setter)
	{
		DweSliderIntData data;
		data.label_ = _label;
		data.min_value_ = _min;
		data.max_value_ = _max;
		data.step_ = _step;
		data.value_getter_ = std::move(_getter);
		data.value_setter_ = std::move(_setter);
		_Assist.SliderInt(kCharacterWindowName, _key, std::move(data));
	};

	auto add_combo = [this](
		const std::wstring& _key,
		const std::wstring& _label,
		_int _max_visible_options,
		std::function<std::vector<std::wstring>()> _option_provider,
		std::function<_int()> _getter,
		std::function<void(_int)> _setter)
	{
		DweComboBoxData data;
		data.label_ = _label;
		data.max_visible_options_ = _max_visible_options;
		data.option_provider_ = std::move(_option_provider);
		data.selected_index_getter_ = std::move(_getter);
		data.selected_index_setter_ = std::move(_setter);
		_Assist.ComboBox(kCharacterWindowName, _key, std::move(data));
	};

	auto add_text_input = [this](
		const std::wstring& _key,
		const std::wstring& _label,
		size_t _max_length,
		std::function<std::wstring()> _getter,
		std::function<void(const std::wstring&)> _setter)
	{
		DweInputTextData data;
		data.label_ = _label;
		data.max_length_ = _max_length;
		data.value_getter_ = std::move(_getter);
		data.value_setter_ = std::move(_setter);
		_Assist.InputText(kCharacterWindowName, _key, std::move(data));
	};

	DweDynamicTextData status_data;
	status_data.text_provider_ = [this]()
	{
		DweTextData data(status_text_.empty() ? L"Ready." : status_text_);
		data.color_ = status_color_;
		data.font_size_ = 12.f;
		return data;
	};
	_Assist.DynamicText(kCharacterWindowName, L"01_status", std::move(status_data));

	add_combo(
		L"02_mode",
		L"Mode",
		4,
		[this]() { return _GetModeLabels(); },
		[this]() { return _GetSelectedModeIndex(); },
		[this](_int _index) { _SetSelectedModeIndex(_index); });

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

	_Assist.Separator(kCharacterWindowName, L"10_common_header", DweSeparatorData{ L"Common Data", true });

	add_text_input(
		L"11_name",
		L"Name",
		96,
		[this]()
	{
		const auto* unit_info = _GetSelectedUnitInfo();
		return unit_info != nullptr ? _UtilFunc::ToWString(unit_info->name_) : std::wstring();
	},
		[this](const std::wstring& _value)
	{
		_UpdateSelectedUnit([&](UnitJsonInfo& _info)
		{
			_info.name_ = _UtilFunc::ToString(_value);
		});
	});

	add_float(
		L"12_body",
		L"Body Size",
		1.f,
		240.f,
		1.f,
		0,
		[this]() { const auto* info = _GetSelectedUnitInfo(); return info ? info->body_size_ : 0.f; },
		[this](_float _value) { _UpdateSelectedUnit([&](UnitJsonInfo& _info) { _info.body_size_ = ClampFloat(_value, 1.f, 240.f); }); });

	add_float(
		L"13_hp",
		L"HP",
		0.f,
		1000.f,
		1.f,
		0,
		[this]() { const auto* info = _GetSelectedUnitInfo(); return info ? info->hp_ : 0.f; },
		[this](_float _value) { _UpdateSelectedUnit([&](UnitJsonInfo& _info) { _info.hp_ = std::max(0.f, _value); }); });

	add_float(
		L"14_contact_damage",
		L"Contact Dmg",
		0.f,
		200.f,
		1.f,
		0,
		[this]() { const auto* info = _GetSelectedUnitInfo(); return info ? info->contact_damage_ : 0.f; },
		[this](_float _value) { _UpdateSelectedUnit([&](UnitJsonInfo& _info) { _info.contact_damage_ = std::max(0.f, _value); }); });

	add_float(
		L"15_attack_speed",
		L"Attack Speed",
		0.f,
		5.f,
		0.01f,
		2,
		[this]() { const auto* info = _GetSelectedUnitInfo(); return info ? s_float(info->attack_speed_) : 0.f; },
		[this](_float _value) { _UpdateSelectedUnit([&](UnitJsonInfo& _info) { _info.attack_speed_ = std::max(0.0, s_double(_value)); }); });

	_Assist.Separator(kCharacterWindowName, L"20_nav_header", DweSeparatorData{ L"Navigation / Bounds", true });

	add_combo(
		L"21_nav_mode",
		L"Nav Mode",
		4,
		[this]() { return _GetNavModeLabels(); },
		[this]()
	{
		if (const auto* info = _GetSelectedPlayableInfo())
			return s_int(info->nav_boundary_mode_);
		if (const auto* info = _GetSelectedEnemyInfo())
			return s_int(info->nav_boundary_mode_);
		return 0;
	},
		[this](_int _index)
	{
		const auto mode = s_cast(NavBoundaryMode, std::clamp(_index, 0, 2));
		if (this->mode_ == CharacterStationMode::Playable)
			_UpdateSelectedPlayable([&](PlayableCharacterJsonInfo& _info) { _info.nav_boundary_mode_ = mode; });
		else
			_UpdateSelectedEnemy([&](EnemyJsonInfo& _info) { _info.nav_boundary_mode_ = mode; });
	});

	add_float(
		L"22_nav_footprint_radius",
		L"Footprint R",
		0.f,
		160.f,
		1.f,
		0,
		[this]()
	{
		if (const auto* info = _GetSelectedPlayableInfo()) return info->nav_footprint_radius_;
		if (const auto* info = _GetSelectedEnemyInfo()) return info->nav_footprint_radius_;
		return 0.f;
	},
		[this](_float _value)
	{
		if (mode_ == CharacterStationMode::Playable)
			_UpdateSelectedPlayable([&](PlayableCharacterJsonInfo& _info) { _info.nav_footprint_radius_ = std::max(0.f, _value); });
		else
			_UpdateSelectedEnemy([&](EnemyJsonInfo& _info) { _info.nav_footprint_radius_ = std::max(0.f, _value); });
	});

	add_float(
		L"23_nav_footprint_offset_y",
		L"Footprint Y",
		-120.f,
		120.f,
		1.f,
		0,
		[this]()
	{
		if (const auto* info = _GetSelectedPlayableInfo()) return info->nav_footprint_offset_y_;
		if (const auto* info = _GetSelectedEnemyInfo()) return info->nav_footprint_offset_y_;
		return 0.f;
	},
		[this](_float _value)
	{
		if (mode_ == CharacterStationMode::Playable)
			_UpdateSelectedPlayable([&](PlayableCharacterJsonInfo& _info) { _info.nav_footprint_offset_y_ = _value; });
		else
			_UpdateSelectedEnemy([&](EnemyJsonInfo& _info) { _info.nav_footprint_offset_y_ = _value; });
	});

	add_float(
		L"24_nav_visual_margin_x",
		L"Visual X",
		0.f,
		240.f,
		1.f,
		0,
		[this]()
	{
		if (const auto* info = _GetSelectedPlayableInfo()) return info->nav_visual_margin_x_;
		if (const auto* info = _GetSelectedEnemyInfo()) return info->nav_visual_margin_x_;
		return 0.f;
	},
		[this](_float _value)
	{
		if (mode_ == CharacterStationMode::Playable)
			_UpdateSelectedPlayable([&](PlayableCharacterJsonInfo& _info) { _info.nav_visual_margin_x_ = std::max(0.f, _value); });
		else
			_UpdateSelectedEnemy([&](EnemyJsonInfo& _info) { _info.nav_visual_margin_x_ = std::max(0.f, _value); });
	});

	add_float(
		L"25_nav_visual_margin_y",
		L"Visual Y",
		0.f,
		240.f,
		1.f,
		0,
		[this]()
	{
		if (const auto* info = _GetSelectedPlayableInfo()) return info->nav_visual_margin_y_;
		if (const auto* info = _GetSelectedEnemyInfo()) return info->nav_visual_margin_y_;
		return 0.f;
	},
		[this](_float _value)
	{
		if (mode_ == CharacterStationMode::Playable)
			_UpdateSelectedPlayable([&](PlayableCharacterJsonInfo& _info) { _info.nav_visual_margin_y_ = std::max(0.f, _value); });
		else
			_UpdateSelectedEnemy([&](EnemyJsonInfo& _info) { _info.nav_visual_margin_y_ = std::max(0.f, _value); });
	});

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
	_Assist.DynamicText(kCharacterWindowName, L"26_collider", std::move(collider_data));

	_Assist.Separator(kCharacterWindowName, L"30_playable_header", DweSeparatorData{ L"Playable Only", true });

	add_float(
		L"31_attack_range",
		L"Attack Range",
		0.f,
		400.f,
		1.f,
		0,
		[this]() { const auto* info = _GetSelectedPlayableInfo(); return info ? info->attack_range_ : 0.f; },
		[this](_float _value) { _UpdateSelectedPlayable([&](PlayableCharacterJsonInfo& _info) { _info.attack_range_ = std::max(0.f, _value); }); });

	add_float(
		L"32_collector",
		L"Collector",
		0.f,
		400.f,
		1.f,
		0,
		[this]() { const auto* info = _GetSelectedPlayableInfo(); return info ? info->collector_size_ : 0.f; },
		[this](_float _value) { _UpdateSelectedPlayable([&](PlayableCharacterJsonInfo& _info) { _info.collector_size_ = std::max(0.f, _value); }); });

	add_float(
		L"33_move_speed_max",
		L"Move Max",
		0.f,
		1000.f,
		5.f,
		0,
		[this]() { const auto* info = _GetSelectedPlayableInfo(); return info ? info->move_speed_max_ : 0.f; },
		[this](_float _value) { _UpdateSelectedPlayable([&](PlayableCharacterJsonInfo& _info) { _info.move_speed_max_ = std::max(0.f, _value); }); });

	add_float(
		L"34_acceleration",
		L"Acceleration",
		0.f,
		2000.f,
		10.f,
		0,
		[this]() { const auto* info = _GetSelectedPlayableInfo(); return info ? info->acceleration_ : 0.f; },
		[this](_float _value) { _UpdateSelectedPlayable([&](PlayableCharacterJsonInfo& _info) { _info.acceleration_ = std::max(0.f, _value); }); });

	add_float(
		L"35_friction",
		L"Friction",
		0.f,
		30.f,
		0.1f,
		1,
		[this]() { const auto* info = _GetSelectedPlayableInfo(); return info ? info->friction_ : 0.f; },
		[this](_float _value) { _UpdateSelectedPlayable([&](PlayableCharacterJsonInfo& _info) { _info.friction_ = std::max(0.f, _value); }); });

	_Assist.Separator(kCharacterWindowName, L"40_clip_header", DweSeparatorData{ L"Animation Clip", true });

	DweSelectableListData clip_list_data;
	clip_list_data.label_ = L"Clips";
	clip_list_data.max_visible_items_ = 10;
	clip_list_data.item_provider_ = [this]() { return _GetClipLabels(); };
	clip_list_data.selected_index_getter_ = [this]() { return _GetSelectedClipIndex(); };
	clip_list_data.selected_index_setter_ = [this](_int _index) { _SetSelectedClipIndex(_index); };
	_Assist.SelectableList(kCharacterWindowName, L"41_clip_list", std::move(clip_list_data));

	DweDynamicTextData clip_summary_data;
	clip_summary_data.text_provider_ = [this]()
	{
		DweTextData data(_GetSelectedClipSummary());
		data.color_ = _GetSelectedClipInfo() != nullptr ? Palette::Black : Palette::Red;
		data.font_size_ = 12.f;
		return data;
	};
	_Assist.DynamicText(kCharacterWindowName, L"42_clip_summary", std::move(clip_summary_data));

	add_text_input(
		L"43_clip_name",
		L"Clip Name",
		64,
		[this]() { const auto* clip = _GetSelectedClipInfo(); return clip ? _UtilFunc::ToWString(clip->clip_name_) : std::wstring(); },
		[this](const std::wstring& _value) { _UpdateSelectedClip([&](AnimationClipPathInfo& _clip) { _clip.clip_name_ = _UtilFunc::ToString(_value); }); });

	add_text_input(
		L"44_clip_directory",
		L"Directory",
		160,
		[this]() { const auto* clip = _GetSelectedClipInfo(); return clip ? _UtilFunc::ToWString(clip->directory_) : std::wstring(); },
		[this](const std::wstring& _value) { _UpdateSelectedClip([&](AnimationClipPathInfo& _clip) { _clip.directory_ = _UtilFunc::ToString(_value); }); });

	add_text_input(
		L"45_clip_prefix",
		L"Prefix",
		96,
		[this]() { const auto* clip = _GetSelectedClipInfo(); return clip ? _UtilFunc::ToWString(clip->prefix_) : std::wstring(); },
		[this](const std::wstring& _value) { _UpdateSelectedClip([&](AnimationClipPathInfo& _clip) { _clip.prefix_ = _UtilFunc::ToString(_value); }); });

	add_int(
		L"46_clip_start",
		L"Start",
		0,
		999,
		1,
		[this]() { const auto* clip = _GetSelectedClipInfo(); return clip ? clip->start_index_ : 0; },
		[this](_int _value) { _UpdateSelectedClip([&](AnimationClipPathInfo& _clip) { _clip.start_index_ = std::max(0, _value); _clip.end_index_ = std::max(_clip.end_index_, _clip.start_index_); }); });

	add_int(
		L"47_clip_end",
		L"End",
		0,
		999,
		1,
		[this]() { const auto* clip = _GetSelectedClipInfo(); return clip ? clip->end_index_ : 0; },
		[this](_int _value) { _UpdateSelectedClip([&](AnimationClipPathInfo& _clip) { _clip.end_index_ = std::max(_clip.start_index_, _value); }); });

	add_float(
		L"48_clip_fps",
		L"FPS",
		0.1f,
		60.f,
		0.1f,
		1,
		[this]() { const auto* clip = _GetSelectedClipInfo(); return clip ? clip->fps_ : 0.f; },
		[this](_float _value) { _UpdateSelectedClip([&](AnimationClipPathInfo& _clip) { _clip.fps_ = std::max(0.1f, _value); }); });

	DweCheckBoxData clip_loop_data;
	clip_loop_data.label_ = L"Loop";
	clip_loop_data.value_getter_ = [this]() { const auto* clip = _GetSelectedClipInfo(); return clip ? clip->loop_ : false; };
	clip_loop_data.value_setter_ = [this](_bool _value) { _UpdateSelectedClip([&](AnimationClipPathInfo& _clip) { _clip.loop_ = _value; }); };
	_Assist.CheckBox(kCharacterWindowName, L"49_clip_loop", std::move(clip_loop_data));

	DweCheckBoxData preview_play_data;
	preview_play_data.label_ = L"Preview Anim";
	preview_play_data.value_getter_ = [this]() { return preview_animation_playing_; };
	preview_play_data.value_setter_ = [this](_bool _value) { preview_animation_playing_ = _value; };
	_Assist.CheckBox(kCharacterWindowName, L"50_preview_anim", std::move(preview_play_data));

	_Assist.Separator(kCharacterWindowName, L"60_enemy_header", DweSeparatorData{ L"Enemy Projectile", true });

	add_combo(
		L"600_enemy_movement",
		L"Movement",
		4,
		[this]() { return _GetMovementPatternLabels(); },
		[this]() { const auto* info = _GetSelectedEnemyInfo(); return info ? s_int(info->movement_pattern_) : 0; },
		[this](_int _index) { _UpdateSelectedEnemy([&](EnemyJsonInfo& _info) { _info.movement_pattern_ = s_cast(MovementPattern, std::clamp(_index, 0, s_int(MovementPattern::Count) - 1)); }); });

	add_int(
		L"601_enemy_move_unit",
		L"Move Unit",
		0,
		40,
		1,
		[this]() { const auto* info = _GetSelectedEnemyInfo(); return info ? s_int(info->move_speed_unit_) : 0; },
		[this](_int _value) { _UpdateSelectedEnemy([&](EnemyJsonInfo& _info) { _info.move_speed_unit_ = s_uint(std::max(0, _value)); }); });

	DweCheckBoxData projectile_enabled_data;
	projectile_enabled_data.label_ = L"Projectile Ability";
	projectile_enabled_data.value_getter_ = [this]()
	{
		const auto* info = _GetSelectedEnemyInfo();
		return info != nullptr && HasEnemyAbilityFlag(info->ability_flags_, EnemyAbilityFlags::ProjectileAttack);
	};
	projectile_enabled_data.value_setter_ = [this](_bool _value)
	{
		_UpdateSelectedEnemy([&](EnemyJsonInfo& _info)
		{
			auto flags = s_uint(_info.ability_flags_);
			if (_value)
				flags |= s_uint(EnemyAbilityFlags::ProjectileAttack);
			else
				flags &= ~s_uint(EnemyAbilityFlags::ProjectileAttack);
			_info.ability_flags_ = s_cast(EnemyAbilityFlags, flags);
		});
	};
	_Assist.CheckBox(kCharacterWindowName, L"61_projectile_enabled", std::move(projectile_enabled_data));

	add_combo(
		L"62_projectile_pattern",
		L"Pattern",
		4,
		[this]() { return _GetProjectilePatternLabels(); },
		[this]() { const auto* info = _GetSelectedEnemyInfo(); return info ? s_int(info->projectile_pattern_) : 0; },
		[this](_int _index) { _UpdateSelectedEnemy([&](EnemyJsonInfo& _info) { _info.projectile_pattern_ = s_cast(ProjectilePattern, std::clamp(_index, 0, s_int(ProjectilePattern::Count) - 1)); }); });

	DweVector2FieldData muzzle_data;
	muzzle_data.label_ = L"Muzzle";
	muzzle_data.min_value_ = -200.f;
	muzzle_data.max_value_ = 200.f;
	muzzle_data.step_ = 1.f;
	muzzle_data.precision_ = 0;
	muzzle_data.value_getter_ = [this]() { return _GetProjectileMuzzleOffset(); };
	muzzle_data.value_setter_ = [this](const _Vector2& _value)
	{
		_UpdateSelectedEnemy([&](EnemyJsonInfo& _info)
		{
			_info.projectile_spawn_offset_x_ = _value.x;
			_info.projectile_spawn_offset_y_ = _value.y;
		});
	};
	_Assist.Vector2Field(kCharacterWindowName, L"63_projectile_muzzle", std::move(muzzle_data));

	add_float(
		L"64_projectile_damage",
		L"Proj Dmg",
		0.f,
		300.f,
		1.f,
		0,
		[this]() { const auto* info = _GetSelectedEnemyInfo(); return info ? info->projectile_damage_ : 0.f; },
		[this](_float _value) { _UpdateSelectedEnemy([&](EnemyJsonInfo& _info) { _info.projectile_damage_ = std::max(0.f, _value); }); });

	add_float(
		L"65_projectile_speed",
		L"Proj Speed",
		0.f,
		1000.f,
		5.f,
		0,
		[this]() { const auto* info = _GetSelectedEnemyInfo(); return info ? info->projectile_speed_ : 0.f; },
		[this](_float _value) { _UpdateSelectedEnemy([&](EnemyJsonInfo& _info) { _info.projectile_speed_ = std::max(0.f, _value); }); });

	add_float(
		L"66_enemy_attack_range",
		L"Atk Range",
		0.f,
		800.f,
		5.f,
		0,
		[this]() { const auto* info = _GetSelectedEnemyInfo(); return info ? info->attack_range_ : 0.f; },
		[this](_float _value) { _UpdateSelectedEnemy([&](EnemyJsonInfo& _info) { _info.attack_range_ = std::max(0.f, _value); }); });

	DweButtonRowData button_data;
	button_data.buttons_.push_back({ L"Reload", [this]() { _ReloadData(); } });
	button_data.buttons_.push_back({ L"Save Current", [this]() { _SaveCurrentModeData(); } });
	button_data.buttons_.push_back({ L"Save All", [this]() { _SaveAllData(); } });
	button_data.buttons_.push_back({ L"Reset Anim", [this]() { _ResetPreviewAnimation(); } });
	_Assist.ButtonRow(kCharacterWindowName, L"90_buttons", std::move(button_data));
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

void CharacterStationScene::_SaveCurrentModeData()
{
	const _bool saved = (mode_ == CharacterStationMode::Playable)
		? _CharacterDagaMgr.Save(kPlayableCharacterPath)
		: _EnemyDataMgr.Save(kEnemyPath);

	if (saved)
	{
		status_text_ = (mode_ == CharacterStationMode::Playable)
			? L"Saved PlayableCharacter data."
			: L"Saved Enemy data.";
		status_color_ = Palette::Green;
	}
	else
	{
		status_text_ = L"Save failed. Check file permissions or logs.";
		status_color_ = Palette::Red;
	}
}

void CharacterStationScene::_SaveAllData()
{
	const _bool playable_saved = _CharacterDagaMgr.Save(kPlayableCharacterPath);
	const _bool enemy_saved = _EnemyDataMgr.Save(kEnemyPath);

	if (playable_saved && enemy_saved)
	{
		status_text_ = L"Saved PlayableCharacter and Enemy data.";
		status_color_ = Palette::Green;
	}
	else
	{
		status_text_ = L"Save failed for one or more character data files.";
		status_color_ = Palette::Red;
	}
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

	_ResetPreviewAnimation();
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

void CharacterStationScene::_ResetPreviewAnimation()
{
	preview_animation_elapsed_ = 0.0;
	_RefreshPreviewSprite();
}

void CharacterStationScene::_AdvancePreviewAnimation(_double _delta_time)
{
	if (!preview_animation_playing_ || mode_ != CharacterStationMode::Playable)
		return;

	const auto* clip_info = _GetSelectedClipInfo();
	if (clip_info == nullptr || clip_info->fps_ <= 0.f)
		return;

	preview_animation_elapsed_ += std::max(0.0, _delta_time);
	_RefreshPreviewSprite();
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

std::vector<std::wstring> CharacterStationScene::_GetClipLabels() const
{
	std::vector<std::wstring> labels;
	const auto* info = _GetSelectedPlayableInfo();
	if (info == nullptr)
	{
		labels.push_back(L"(Playable mode only)");
		return labels;
	}

	for (size_t i = 0; i < info->animation_clips_.size(); ++i)
	{
		const auto& clip = info->animation_clips_[i];
		labels.push_back(
			L"#" + std::to_wstring(i) +
			L" " + _UtilFunc::ToWString(clip.clip_name_) +
			L" [" + std::to_wstring(clip.start_index_) +
			L"-" + std::to_wstring(clip.end_index_) + L"]");
	}

	if (labels.empty())
		labels.push_back(L"(No animation clips)");

	return labels;
}

std::vector<std::wstring> CharacterStationScene::_GetNavModeLabels() const
{
	return { L"None", L"ContainFootprint", L"ContainVisualBounds" };
}

std::vector<std::wstring> CharacterStationScene::_GetMovementPatternLabels() const
{
	return { L"Undefined", L"Directional", L"Target" };
}

std::vector<std::wstring> CharacterStationScene::_GetProjectilePatternLabels() const
{
	return { L"Undefined", L"Direct", L"Aimed" };
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
	_ResetPreviewAnimation();
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

	selected_clip_index_ = 0;
	_ResetPreviewAnimation();
}

_int CharacterStationScene::_GetSelectedClipIndex() const
{
	return s_int(selected_clip_index_);
}

void CharacterStationScene::_SetSelectedClipIndex(_int _index)
{
	const auto* info = _GetSelectedPlayableInfo();
	if (info == nullptr || info->animation_clips_.empty())
	{
		selected_clip_index_ = 0;
		_ResetPreviewAnimation();
		return;
	}

	const auto clamped = std::clamp(_index, 0, s_int(info->animation_clips_.size()) - 1);
	selected_clip_index_ = s_cast(size_t, clamped);
	_ResetPreviewAnimation();
}

const UnitJsonInfo* CharacterStationScene::_GetSelectedUnitInfo() const
{
	if (mode_ == CharacterStationMode::Playable)
		return _CharacterDagaMgr.GetData(selected_playable_id_);

	return _EnemyDataMgr.GetData(selected_enemy_id_);
}

const PlayableCharacterJsonInfo* CharacterStationScene::_GetSelectedPlayableInfo() const
{
	if (mode_ != CharacterStationMode::Playable)
		return nullptr;

	return _CharacterDagaMgr.GetData(selected_playable_id_);
}

const EnemyJsonInfo* CharacterStationScene::_GetSelectedEnemyInfo() const
{
	if (mode_ != CharacterStationMode::Enemy)
		return nullptr;

	return _EnemyDataMgr.GetData(selected_enemy_id_);
}

const AnimationClipPathInfo* CharacterStationScene::_GetSelectedClipInfo() const
{
	const auto* info = _GetSelectedPlayableInfo();
	if (info == nullptr || info->animation_clips_.empty())
		return nullptr;

	const auto index = std::min(selected_clip_index_, info->animation_clips_.size() - 1);
	return &info->animation_clips_[index];
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

std::wstring CharacterStationScene::_GetSelectedClipSummary() const
{
	const auto* clip = _GetSelectedClipInfo();
	if (clip == nullptr)
		return L"Animation clip: none";

	return L"Clip " + _UtilFunc::ToWString(clip->clip_name_) +
		L" | fps=" + FormatFloat(clip->fps_, 1) +
		L" | loop=" + std::wstring(clip->loop_ ? L"true" : L"false");
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

_Vector2 CharacterStationScene::_GetProjectileMuzzleOffset() const
{
	const auto* info = _GetSelectedEnemyInfo();
	if (info == nullptr)
		return _Vector2::Zero();

	return _Vector2(info->projectile_spawn_offset_x_, info->projectile_spawn_offset_y_);
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

	if (const auto* selected_clip = _GetSelectedClipInfo())
	{
		const auto frame_path = _BuildPlayableClipFramePath(*selected_clip, _ResolvePreviewFrameIndex(*selected_clip));
		const auto* sprite = _TryLoadPreviewSprite(frame_path);
		if (sprite != nullptr)
		{
			_out_path = frame_path;
			return sprite;
		}
	}

	for (const auto& clip_info : info->animation_clips_)
	{
		const auto frame_path = _BuildPlayableClipFramePath(clip_info, clip_info.start_index_);
		const auto* sprite = _TryLoadPreviewSprite(frame_path);
		if (sprite == nullptr)
			continue;

		_out_path = frame_path;
		return sprite;
	}

	return nullptr;
}

std::wstring CharacterStationScene::_BuildPlayableClipFramePath(const AnimationClipPathInfo& _clip_info, _int _frame_index) const
{
	return SpriteAnimationBuilder::BuildSequenceFramePath(
		_UtilFunc::ToWString(_clip_info.directory_),
		_UtilFunc::ToWString(_clip_info.prefix_),
		_frame_index);
}

_int CharacterStationScene::_ResolvePreviewFrameIndex(const AnimationClipPathInfo& _clip_info) const
{
	const auto start = std::min(_clip_info.start_index_, _clip_info.end_index_);
	const auto end = std::max(_clip_info.start_index_, _clip_info.end_index_);
	const auto frame_count = std::max(1, end - start + 1);

	if (_clip_info.fps_ <= 0.f)
		return start;

	const auto frame_offset = s_int(std::floor(preview_animation_elapsed_ * _clip_info.fps_));
	if (_clip_info.loop_)
		return start + (frame_offset % frame_count);

	return start + std::min(frame_offset, frame_count - 1);
}

void CharacterStationScene::_UpdateSelectedPlayable(const std::function<void(PlayableCharacterJsonInfo&)>& _mutator)
{
	const auto* current = _CharacterDagaMgr.GetData(selected_playable_id_);
	if (current == nullptr || !_mutator)
		return;

	auto copy = *current;
	_mutator(copy);
	_CharacterDagaMgr.SetData(copy);
	_RefreshPreviewSprite();
}

void CharacterStationScene::_UpdateSelectedEnemy(const std::function<void(EnemyJsonInfo&)>& _mutator)
{
	const auto* current = _EnemyDataMgr.GetData(selected_enemy_id_);
	if (current == nullptr || !_mutator)
		return;

	auto copy = *current;
	_mutator(copy);
	_EnemyDataMgr.SetData(copy);
	_RefreshPreviewSprite();
}

void CharacterStationScene::_UpdateSelectedUnit(const std::function<void(UnitJsonInfo&)>& _mutator)
{
	if (!_mutator)
		return;

	if (mode_ == CharacterStationMode::Playable)
	{
		_UpdateSelectedPlayable([&](PlayableCharacterJsonInfo& _info) { _mutator(_info); });
		return;
	}

	_UpdateSelectedEnemy([&](EnemyJsonInfo& _info) { _mutator(_info); });
}

void CharacterStationScene::_UpdateSelectedClip(const std::function<void(AnimationClipPathInfo&)>& _mutator)
{
	if (!_mutator)
		return;

	_UpdateSelectedPlayable([&](PlayableCharacterJsonInfo& _info)
	{
		if (_info.animation_clips_.empty())
			return;

		const auto index = std::min(selected_clip_index_, _info.animation_clips_.size() - 1);
		_mutator(_info.animation_clips_[index]);
	});

	_ResetPreviewAnimation();
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

	const auto* playable_info = _GetSelectedPlayableInfo();
	const auto* enemy_info = _GetSelectedEnemyInfo();
	const _float footprint_radius = playable_info != nullptr
		? playable_info->nav_footprint_radius_
		: (enemy_info != nullptr ? enemy_info->nav_footprint_radius_ : 0.f);
	const _float footprint_offset_y = playable_info != nullptr
		? playable_info->nav_footprint_offset_y_
		: (enemy_info != nullptr ? enemy_info->nav_footprint_offset_y_ : 0.f);

	if (footprint_radius > 0.f)
	{
		const _Point footprint_center{ _center.x, s_int(std::round(_center.y + footprint_offset_y)) };
		_DrawFunc::DrawCircle(footprint_center, footprint_radius, Palette::Yellow, 1.5f);
	}

	_DrawProjectileMuzzleGuide(_center);

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

void CharacterStationScene::_DrawProjectileMuzzleGuide(const _Point& _center) const
{
	const auto* enemy_info = _GetSelectedEnemyInfo();
	if (enemy_info == nullptr)
		return;

	if (enemy_info->projectile_pattern_ == ProjectilePattern::Undefined &&
		!HasEnemyAbilityFlag(enemy_info->ability_flags_, EnemyAbilityFlags::ProjectileAttack))
	{
		return;
	}

	const auto muzzle = _GetProjectileMuzzleOffset();
	const _Point muzzle_point{
		s_int(std::round(_center.x + muzzle.x)),
		s_int(std::round(_center.y + muzzle.y))
	};

	_DrawFunc::DrawLine(_center, muzzle_point, Palette::LightBlue, 1.5f);
	_DrawFunc::DrawCircle(muzzle_point, 6.f, Palette::Red, 2.f);
	_DrawFunc::DrawString(
		_Point{ muzzle_point.x + 8, muzzle_point.y - 8 },
		L"Muzzle",
		Palette::White,
		12.f,
		false);
}
