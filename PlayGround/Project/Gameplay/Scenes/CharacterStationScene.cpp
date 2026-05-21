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

#include <cctype>
#include <cwctype>
#include <filesystem>
#include <fstream>
#include <iomanip>
#include <set>
#include <sstream>

namespace
{
	constexpr char kPlayableCharacterPath[] = "Data/PlayableCharacter.json";
	constexpr char kEnemyPath[] = "Data/Enemy.json";
	const std::wstring kCharacterWindowName = L"CharacterStation / Character";
	constexpr _int kResourceSequenceVisibleCount = 18;
	constexpr _float kEnemyCombatColliderWidthRatio = 0.35f;

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

	template <typename T>
	std::string DumpJsonData(const T& _data)
	{
		const json j = _data;
		return j.dump();
	}

	template <typename T>
	std::wstring ToJsonShortText(const T& _data)
	{
		const json j = _data;
		auto text = j.dump();
		if (text.size() > 80)
			text = text.substr(0, 77) + "...";
		return _UtilFunc::ToWString(text);
	}

	std::wstring ToJsonShortText(const json& _value)
	{
		auto text = _value.dump();
		if (text.size() > 80)
			text = text.substr(0, 77) + "...";
		return _UtilFunc::ToWString(text);
	}

	std::string NormalizeDirectory(std::filesystem::path _path)
	{
		auto text = _path.generic_string();
		if (!text.empty() && text.back() != '/')
			text.push_back('/');
		return text;
	}

	_bool IsPngPath(const std::filesystem::path& _path)
	{
		auto ext = _path.extension().wstring();
		std::transform(ext.begin(), ext.end(), ext.begin(), [](wchar_t _ch) { return s_cast(wchar_t, std::towlower(_ch)); });
		return ext == L".png";
	}

	std::string MakeClipNameFromPrefix(const std::string& _prefix)
	{
		auto name = _prefix;
		while (!name.empty() && (name.back() == '_' || name.back() == '-' || std::isdigit(s_cast(unsigned char, name.back()))))
			name.pop_back();

		const auto pos = name.find_last_of("_-/\\");
		if (pos != std::string::npos && pos + 1 < name.size())
			name = name.substr(pos + 1);

		std::transform(name.begin(), name.end(), name.begin(), [](unsigned char _ch) { return s_cast(char, std::tolower(_ch)); });
		return name.empty() ? "idle" : name;
	}

	std::wstring ToLowerCopy(std::wstring _value)
	{
		std::transform(_value.begin(), _value.end(), _value.begin(), [](wchar_t _ch) { return s_cast(wchar_t, std::towlower(_ch)); });
		return _value;
	}

	std::vector<std::wstring> SplitFilterTokens(const std::wstring& _filter)
	{
		std::vector<std::wstring> tokens;
		std::wstringstream stream(ToLowerCopy(_filter));
		std::wstring token;
		while (stream >> token)
			tokens.push_back(token);
		return tokens;
	}

	std::wstring FormatFrameIndex(_int _index)
	{
		std::wstringstream stream;
		stream << std::setw(3) << std::setfill(L'0') << _index;
		return stream.str();
	}

	std::wstring TailPathSegments(std::string _path, size_t _segment_count)
	{
		std::replace(_path.begin(), _path.end(), '\\', '/');
		while (!_path.empty() && _path.back() == '/')
			_path.pop_back();

		std::vector<std::string> parts;
		std::stringstream stream(_path);
		std::string part;
		while (std::getline(stream, part, '/'))
		{
			if (!part.empty())
				parts.push_back(part);
		}

		if (parts.empty())
			return L"(root)";

		const size_t begin = parts.size() > _segment_count ? parts.size() - _segment_count : 0;
		std::wstring result;
		for (size_t i = begin; i < parts.size(); ++i)
		{
			if (!result.empty())
				result += L"/";
			result += _UtilFunc::ToWString(parts[i]);
		}
		return result;
	}

}

_bool CharacterStationScene::Initialize()
{
	if (!__super::Initialize())
		return false;

	_RefreshSelection(true);
	_RefreshPreviewSprite();
	_CaptureBaseline();
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
		_RequestExitToIntro();
		return UPDATE_BREAK;
	}

	if (can_use_scene_shortcut && _InputMgr.Down(VK_F5))
		_RequestReload();

	if (can_use_scene_shortcut && _InputMgr.Down(VK_F9))
		_SaveCurrentModeData();

	_AdvancePreviewAnimation(_delta_time);
	if (show_projectile_test_guide_ && mode_ == CharacterStationMode::Enemy)
		projectile_preview_elapsed_ += std::max(0.0, _delta_time);

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
	_DrawFunc::DrawString(_Point{ 24, 132 }, _GetDirtySummary(), _IsAnyDirty() ? Palette::Orange : Palette::Green, 13.f, false);

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

void CharacterStationScene::_RequestExitToIntro()
{
	if (_IsAnyDirty() && !pending_exit_confirm_)
	{
		pending_exit_confirm_ = true;
		pending_reload_confirm_ = false;
		status_text_ = L"Unsaved changes exist. Press Esc again to leave without saving.";
		status_color_ = Palette::Orange;
		return;
	}

	_SceneMgr.ChangeScene(SceneType::Intro);
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

	auto add_check = [this](
		const std::wstring& _key,
		const std::wstring& _label,
		std::function<_bool()> _getter,
		std::function<void(_bool)> _setter)
	{
		DweCheckBoxData data;
		data.label_ = _label;
		data.value_getter_ = std::move(_getter);
		data.value_setter_ = std::move(_setter);
		_Assist.CheckBox(kCharacterWindowName, _key, std::move(data));
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

	DweDynamicTextData dirty_data;
	dirty_data.text_provider_ = [this]()
	{
		DweTextData data(_GetDirtySummary());
		data.color_ = _IsAnyDirty() ? Palette::Orange : Palette::Green;
		data.font_size_ = 12.f;
		return data;
	};
	_Assist.DynamicText(kCharacterWindowName, L"06_dirty", std::move(dirty_data));

	DweDynamicTextData diff_data;
	diff_data.text_provider_ = [this]()
	{
		DweTextData data(_GetCurrentDiffSummary());
		data.color_ = _IsCurrentDirty() ? Palette::Black : Palette::Green;
		data.font_size_ = 12.f;
		return data;
	};
	_Assist.DynamicText(kCharacterWindowName, L"07_diff", std::move(diff_data));

	DweDynamicTextData validation_data;
	validation_data.text_provider_ = [this]()
	{
		const auto report = _GetValidationReport();
		DweTextData data(report);
		data.color_ = (report.find(L"OK") != std::wstring::npos) ? Palette::Green : Palette::Red;
		data.font_size_ = 12.f;
		return data;
	};
	_Assist.DynamicText(kCharacterWindowName, L"08_validation", std::move(validation_data));

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

	add_combo(
		L"400_preview_state",
		L"Preview State",
		8,
		[this]() { return _GetPreviewStateLabels(); },
		[this]() { return _GetSelectedPreviewStateIndex(); },
		[this](_int _index) { _SetSelectedPreviewStateIndex(_index); });

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

	add_text_input(
		L"51_resource_filter",
		L"Res Filter",
		96,
		[this]() { return resource_sequence_filter_; },
		[this](const std::wstring& _value)
	{
		resource_sequence_filter_ = _value;
		resource_sequence_page_ = 0;
		selected_resource_sequence_key_.clear();
		_FocusResourceSequenceOnSelectedClip();
	});

	add_check(
		L"511_resource_current_only",
		L"Current Only",
		[this]() { return show_current_character_resources_only_; },
		[this](_bool _value)
	{
		show_current_character_resources_only_ = _value;
		resource_sequence_page_ = 0;
		selected_resource_sequence_key_.clear();
		_FocusResourceSequenceOnSelectedClip();
	});

	DweDynamicTextData resource_sequence_summary_data;
	resource_sequence_summary_data.text_provider_ = [this]()
	{
		DweTextData data(_GetResourceSequenceSummary());
		data.color_ = Palette::Black;
		data.font_size_ = 12.f;
		return data;
	};
	_Assist.DynamicText(kCharacterWindowName, L"512_resource_summary", std::move(resource_sequence_summary_data));

	DweSelectableListData resource_sequence_list_data;
	resource_sequence_list_data.label_ = L"Resource Seq";
	resource_sequence_list_data.max_visible_items_ = kResourceSequenceVisibleCount;
	resource_sequence_list_data.item_provider_ = [this]() { return _GetResourceSequenceLabels(); };
	resource_sequence_list_data.selected_index_getter_ = [this]() { return _GetSelectedResourceSequenceIndex(); };
	resource_sequence_list_data.selected_index_setter_ = [this](_int _index) { _SetSelectedResourceSequenceIndex(_index); };
	_Assist.SelectableList(kCharacterWindowName, L"52_resource_sequence_list", std::move(resource_sequence_list_data));

	DweDynamicTextData frame_check_data;
	frame_check_data.text_provider_ = [this]()
	{
		const auto summary = _GetFrameCheckSummary();
		DweTextData data(summary);
		data.color_ = (summary.find(L"missing=0") != std::wstring::npos) ? Palette::Green : Palette::Red;
		data.font_size_ = 12.f;
		return data;
	};
	_Assist.DynamicText(kCharacterWindowName, L"53_frame_check", std::move(frame_check_data));

	DweButtonRowData clip_button_data;
	clip_button_data.buttons_.push_back({ L"Add Clip", [this]() { _AddClip(); } });
	clip_button_data.buttons_.push_back({ L"Dup Clip", [this]() { _DuplicateClip(); } });
	clip_button_data.buttons_.push_back({ L"Del Clip", [this]() { _RemoveClip(); } });
	_Assist.ButtonRow(kCharacterWindowName, L"54_clip_buttons", std::move(clip_button_data));

	DweButtonRowData resource_button_data;
	resource_button_data.buttons_.push_back({ L"Prev Res", [this]() { _MoveResourceSequencePage(-1); } });
	resource_button_data.buttons_.push_back({ L"Next Res", [this]() { _MoveResourceSequencePage(1); } });
	resource_button_data.buttons_.push_back({ L"Apply Res", [this]()
	{
		ResourceSequenceCandidate candidate;
		if (_TryGetSelectedResourceSequenceCandidate(candidate))
		{
			_ApplyResourceCandidateToSelectedClip(candidate);
		}
		else
		{
			status_text_ = L"No resource sequence selected.";
			status_color_ = Palette::Orange;
		}
	} });
	_Assist.ButtonRow(kCharacterWindowName, L"55_resource_buttons", std::move(resource_button_data));

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

	_Assist.Separator(kCharacterWindowName, L"70_preview_header", DweSeparatorData{ L"Preview Guides", true });

	add_check(L"71_show_body", L"Body", [this]() { return show_body_guide_; }, [this](_bool _value) { show_body_guide_ = _value; });
	add_check(L"72_show_nav", L"Nav", [this]() { return show_nav_guide_; }, [this](_bool _value) { show_nav_guide_ = _value; });
	add_check(L"73_show_visual", L"Visual Bounds", [this]() { return show_visual_bounds_guide_; }, [this](_bool _value) { show_visual_bounds_guide_ = _value; });
	add_check(L"74_show_attack", L"Attack Range", [this]() { return show_attack_range_guide_; }, [this](_bool _value) { show_attack_range_guide_ = _value; });
	add_check(L"75_show_collector", L"Collector", [this]() { return show_collector_range_guide_; }, [this](_bool _value) { show_collector_range_guide_ = _value; });
	add_check(L"76_show_muzzle", L"Muzzle", [this]() { return show_muzzle_guide_; }, [this](_bool _value) { show_muzzle_guide_ = _value; });
	add_check(L"77_show_projectile_test", L"Projectile Test", [this]() { return show_projectile_test_guide_; }, [this](_bool _value) { show_projectile_test_guide_ = _value; projectile_preview_elapsed_ = 0.0; });
	add_check(L"78_show_frame_bounds", L"Frame Bounds", [this]() { return show_frame_bounds_guide_; }, [this](_bool _value) { show_frame_bounds_guide_ = _value; });

	_Assist.Separator(kCharacterWindowName, L"80_data_header", DweSeparatorData{ L"Data Actions", true });

	DweButtonRowData create_button_data;
	create_button_data.buttons_.push_back({ L"New Playable", [this]() { _CreateNewPlayable(); } });
	create_button_data.buttons_.push_back({ L"New Enemy", [this]() { _CreateNewEnemy(); } });
	create_button_data.buttons_.push_back({ L"Dup New", [this]() { _DuplicateCurrentAsNewId(); } });
	create_button_data.buttons_.push_back({ L"Revert Cur", [this]() { _RevertCurrent(); } });
	_Assist.ButtonRow(kCharacterWindowName, L"81_create_buttons", std::move(create_button_data));

	DweButtonRowData preset_button_data;
	preset_button_data.buttons_.push_back({ L"Balanced", [this]() { _ApplyBalancedPreset(); } });
	preset_button_data.buttons_.push_back({ L"Fast", [this]() { _ApplyFastPreset(); } });
	preset_button_data.buttons_.push_back({ L"Shooter", [this]() { _ApplyShooterPreset(); } });
	preset_button_data.buttons_.push_back({ L"Tank", [this]() { _ApplyTankPreset(); } });
	_Assist.ButtonRow(kCharacterWindowName, L"82_preset_buttons", std::move(preset_button_data));

	DweButtonRowData revert_button_data;
	revert_button_data.buttons_.push_back({ L"Revert Mode", [this]() { _RevertMode(); } });
	revert_button_data.buttons_.push_back({ L"Validate", [this]() { status_text_ = _GetValidationReport(); status_color_ = Palette::White; } });
	_Assist.ButtonRow(kCharacterWindowName, L"83_revert_buttons", std::move(revert_button_data));

	DweButtonRowData button_data;
	button_data.buttons_.push_back({ L"Reload", [this]() { _RequestReload(); } });
	button_data.buttons_.push_back({ L"Save Current", [this]() { _SaveCurrentModeData(); } });
	button_data.buttons_.push_back({ L"Save All", [this]() { _SaveAllData(); } });
	button_data.buttons_.push_back({ L"Reset Anim", [this]() { _ResetPreviewAnimation(); } });
	_Assist.ButtonRow(kCharacterWindowName, L"90_buttons", std::move(button_data));
}

void CharacterStationScene::_RequestReload()
{
	if (_IsAnyDirty() && !pending_reload_confirm_)
	{
		pending_reload_confirm_ = true;
		pending_exit_confirm_ = false;
		status_text_ = L"Unsaved changes exist. Press Reload again to discard local edits.";
		status_color_ = Palette::Orange;
		return;
	}

	pending_reload_confirm_ = false;
	_ReloadData();
}

void CharacterStationScene::_ReloadData()
{
	if (!GameDataLoader::ReloadAll())
	{
		status_text_ = L"Reload failed. Check JSON syntax and logs.";
		status_color_ = Palette::Red;
		return;
	}

	_CaptureBaseline();
	_RefreshSelection(false);
	_RefreshPreviewSprite();
	pending_exit_confirm_ = false;
	pending_reload_confirm_ = false;
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
		if (mode_ == CharacterStationMode::Playable)
			_CapturePlayableBaseline();
		else
			_CaptureEnemyBaseline();

		pending_exit_confirm_ = false;
		pending_reload_confirm_ = false;
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
		_CaptureBaseline();
		pending_exit_confirm_ = false;
		pending_reload_confirm_ = false;
		status_text_ = L"Saved PlayableCharacter and Enemy data.";
		status_color_ = Palette::Green;
	}
	else
	{
		status_text_ = L"Save failed for one or more character data files.";
		status_color_ = Palette::Red;
	}
}

void CharacterStationScene::_CaptureBaseline()
{
	_CapturePlayableBaseline();
	_CaptureEnemyBaseline();
}

void CharacterStationScene::_CapturePlayableBaseline()
{
	baseline_playable_table_.clear();
	for (const auto& [id, info] : _CharacterDagaMgr.GetTable())
		baseline_playable_table_[id] = info;
}

void CharacterStationScene::_CaptureEnemyBaseline()
{
	baseline_enemy_table_.clear();
	for (const auto& [id, info] : _EnemyDataMgr.GetTable())
		baseline_enemy_table_[id] = info;
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

	selected_resource_sequence_key_.clear();
	resource_sequence_page_ = 0;
	_ResetPreviewAnimation();
	_FocusResourceSequenceOnSelectedClip();
}

void CharacterStationScene::_RefreshPreviewSprite()
{
	preview_sprite_ = nullptr;
	preview_sprite_path_.clear();
	preview_sprite_source_.clear();

	const auto* unit_info = _GetSelectedUnitInfo();
	if (unit_info == nullptr)
		return;

	if (const auto* clips = _GetSelectedClipList(); clips != nullptr && !clips->empty())
	{
		preview_sprite_source_ = L"animation_clips_";
		preview_sprite_ = _TryLoadAnimationPreview(preview_sprite_path_);
		if (preview_sprite_ != nullptr)
			return;
	}

	preview_sprite_source_ = L"legacy image_path_";
	preview_sprite_ = _TryLoadLegacyPreview(preview_sprite_path_);
}

void CharacterStationScene::_ResetPreviewAnimation()
{
	preview_animation_elapsed_ = 0.0;
	_RefreshPreviewSprite();
}

void CharacterStationScene::_AdvancePreviewAnimation(_double _delta_time)
{
	if (!preview_animation_playing_)
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
	const auto* clips = _GetSelectedClipList();
	if (clips == nullptr)
	{
		labels.push_back(L"(No character selected)");
		return labels;
	}

	for (size_t i = 0; i < clips->size(); ++i)
	{
		const auto& clip = (*clips)[i];
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

std::vector<std::wstring> CharacterStationScene::_GetPreviewStateLabels() const
{
	if (mode_ == CharacterStationMode::Playable)
		return { L"Manual", L"idle", L"move", L"attack", L"spell", L"hit", L"death" };

	return { L"Manual", L"spawn", L"idle", L"move", L"hit", L"attack", L"death" };
}

std::vector<CharacterStationScene::ResourceSequenceCandidate> CharacterStationScene::_GetResourceSequenceCandidates() const
{
	struct SequenceKey
	{
		std::string directory_;
		std::string prefix_;

		_bool operator<(const SequenceKey& _rhs) const
		{
			if (directory_ != _rhs.directory_)
				return directory_ < _rhs.directory_;
			return prefix_ < _rhs.prefix_;
		}
	};

	std::map<SequenceKey, ResourceSequenceCandidate> candidate_map;
	const std::filesystem::path root("Data/Resources/Textures/Characters");
	if (!std::filesystem::exists(root))
		return {};

	for (const auto& entry : std::filesystem::recursive_directory_iterator(root))
	{
		if (!entry.is_regular_file() || !IsPngPath(entry.path()))
			continue;

		const auto stem = entry.path().stem().string();
		size_t digit_begin = stem.size();
		while (digit_begin > 0 && std::isdigit(s_cast(unsigned char, stem[digit_begin - 1])))
			--digit_begin;

		if (digit_begin == stem.size())
			continue;

		const auto digits = stem.substr(digit_begin);
		const auto prefix = stem.substr(0, digit_begin);
		const auto index = std::stoi(digits);
		const auto directory = NormalizeDirectory(entry.path().parent_path());
		const SequenceKey key{ directory, prefix };

		auto& candidate = candidate_map[key];
		candidate.directory_ = directory;
		candidate.prefix_ = prefix;
		if (candidate.frame_count_ <= 0)
		{
			candidate.start_index_ = index;
			candidate.end_index_ = index;
		}
		else
		{
			candidate.start_index_ = std::min(candidate.start_index_, index);
			candidate.end_index_ = std::max(candidate.end_index_, index);
		}
		++candidate.frame_count_;
	}

	std::vector<ResourceSequenceCandidate> candidates;
	candidates.reserve(candidate_map.size());
	for (const auto& [key, candidate] : candidate_map)
	{
		(void)key;
		candidates.push_back(candidate);
	}

	for (auto& candidate : candidates)
	{
		AnimationClipPathInfo clip_info;
		clip_info.directory_ = candidate.directory_;
		clip_info.prefix_ = candidate.prefix_;
		clip_info.start_index_ = candidate.start_index_;
		clip_info.end_index_ = candidate.end_index_;
		clip_info.fps_ = 1.f;
		clip_info.loop_ = false;

		_int missing_count = 0;
		for (_int frame = candidate.start_index_; frame <= candidate.end_index_; ++frame)
		{
			if (!_FramePathExists(_BuildClipFramePath(clip_info, frame)))
				++missing_count;
		}
		candidate.missing_count_ = missing_count;
	}

	std::sort(candidates.begin(), candidates.end(),
		[](const ResourceSequenceCandidate& _lhs, const ResourceSequenceCandidate& _rhs)
	{
		if (_lhs.directory_ != _rhs.directory_)
			return _lhs.directory_ < _rhs.directory_;
		return _lhs.prefix_ < _rhs.prefix_;
	});

	return candidates;
}

std::vector<CharacterStationScene::ResourceSequenceCandidate> CharacterStationScene::_GetFilteredResourceSequenceCandidates() const
{
	std::vector<ResourceSequenceCandidate> filtered;
	const auto candidates = _GetResourceSequenceCandidates();
	filtered.reserve(candidates.size());

	for (const auto& candidate : candidates)
	{
		if (show_current_character_resources_only_ && !_DoesResourceCandidateMatchCurrentCharacter(candidate))
			continue;
		if (!_DoesResourceCandidateMatchFilter(candidate))
			continue;
		filtered.push_back(candidate);
	}

	return filtered;
}

std::vector<CharacterStationScene::ResourceSequenceCandidate> CharacterStationScene::_GetVisibleResourceSequenceCandidates() const
{
	std::vector<ResourceSequenceCandidate> visible;
	const auto filtered = _GetFilteredResourceSequenceCandidates();
	if (filtered.empty())
		return visible;

	const _int page_count = std::max(1, (s_int(filtered.size()) + kResourceSequenceVisibleCount - 1) / kResourceSequenceVisibleCount);
	const _int page = std::clamp(resource_sequence_page_, 0, page_count - 1);
	const _int start = page * kResourceSequenceVisibleCount;
	const _int end = std::min(start + kResourceSequenceVisibleCount, s_int(filtered.size()));
	visible.reserve(std::max(0, end - start));
	for (_int i = start; i < end; ++i)
		visible.push_back(filtered[i]);

	return visible;
}

std::vector<std::wstring> CharacterStationScene::_GetResourceSequenceLabels() const
{
	std::vector<std::wstring> labels;
	const auto candidates = _GetVisibleResourceSequenceCandidates();
	for (const auto& candidate : candidates)
		labels.push_back(_GetResourceSequenceLabel(candidate));

	return labels;
}

std::wstring CharacterStationScene::_GetResourceSequenceSummary() const
{
	const auto all = _GetResourceSequenceCandidates();
	const auto filtered = _GetFilteredResourceSequenceCandidates();
	const _int page_count = std::max(1, (s_int(filtered.size()) + kResourceSequenceVisibleCount - 1) / kResourceSequenceVisibleCount);
	const _int page = std::clamp(resource_sequence_page_, 0, page_count - 1);
	const _int start = filtered.empty() ? 0 : page * kResourceSequenceVisibleCount + 1;
	const _int end = filtered.empty() ? 0 : std::min((page + 1) * kResourceSequenceVisibleCount, s_int(filtered.size()));

	std::wstring summary =
		L"Resources: all=" + std::to_wstring(all.size()) +
		L", filtered=" + std::to_wstring(filtered.size()) +
		L", showing=" + std::to_wstring(start) + L"-" + std::to_wstring(end) +
		L", page=" + std::to_wstring(page + 1) + L"/" + std::to_wstring(page_count);

	ResourceSequenceCandidate selected;
	if (_TryGetSelectedResourceSequenceCandidate(selected))
		summary += L", selected=" + _GetResourceSequenceLabel(selected);
	else
		summary += L", selected=<none>";

	return summary;
}

std::wstring CharacterStationScene::_GetResourceSequenceLabel(const ResourceSequenceCandidate& _candidate) const
{
	std::wstring label =
		TailPathSegments(_candidate.directory_, 3) +
		L" / " + _UtilFunc::ToWString(_candidate.prefix_) + L" ";

	if (_candidate.start_index_ == _candidate.end_index_ && _candidate.frame_count_ == 1)
	{
		label += L"[single " + FormatFrameIndex(_candidate.start_index_) + L"]";
	}
	else
	{
		label +=
			L"[" + FormatFrameIndex(_candidate.start_index_) +
			L"-" + FormatFrameIndex(_candidate.end_index_) +
			L", count=" + std::to_wstring(_candidate.frame_count_) + L"]";
	}

	label += _candidate.missing_count_ == 0
		? L" OK"
		: L" missing " + std::to_wstring(_candidate.missing_count_);

	if (_DoesResourceCandidateMatchSelectedClip(_candidate))
		label += L" <current>";

	return label;
}

_int CharacterStationScene::_GetSelectedModeIndex() const
{
	return s_int(mode_);
}

void CharacterStationScene::_SetSelectedModeIndex(_int _index)
{
	const auto clamped = std::clamp(_index, 0, s_int(CharacterStationMode::Count) - 1);
	mode_ = s_cast(CharacterStationMode, clamped);
	selected_preview_state_index_ = 0;
	selected_resource_sequence_key_.clear();
	resource_sequence_page_ = 0;
	_RefreshSelection(false);
	_ResetPreviewAnimation();
	_FocusResourceSequenceOnSelectedClip();
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
	selected_preview_state_index_ = 0;
	selected_resource_sequence_key_.clear();
	resource_sequence_page_ = 0;
	_ResetPreviewAnimation();
	_FocusResourceSequenceOnSelectedClip();
}

_int CharacterStationScene::_GetSelectedClipIndex() const
{
	return s_int(selected_clip_index_);
}

void CharacterStationScene::_SetSelectedClipIndex(_int _index)
{
	const auto* clips = _GetSelectedClipList();
	if (clips == nullptr || clips->empty())
	{
		selected_clip_index_ = 0;
		selected_preview_state_index_ = 0;
		selected_resource_sequence_key_.clear();
		resource_sequence_page_ = 0;
		_ResetPreviewAnimation();
		return;
	}

	const auto clamped = std::clamp(_index, 0, s_int(clips->size()) - 1);
	selected_clip_index_ = s_cast(size_t, clamped);
	selected_preview_state_index_ = 0;
	selected_resource_sequence_key_.clear();
	_ResetPreviewAnimation();
	_FocusResourceSequenceOnSelectedClip();
}

_int CharacterStationScene::_GetSelectedPreviewStateIndex() const
{
	return selected_preview_state_index_;
}

void CharacterStationScene::_SetSelectedPreviewStateIndex(_int _index)
{
	const auto labels = _GetPreviewStateLabels();
	if (labels.empty())
		return;

	const auto clamped = std::clamp(_index, 0, s_int(labels.size()) - 1);
	selected_preview_state_index_ = clamped;
	if (clamped <= 0)
		return;

	if (!_SelectClipByName(labels[clamped]))
	{
		status_text_ = L"Preview state clip not found: " + labels[clamped];
		status_color_ = Palette::Orange;
	}
}

_int CharacterStationScene::_GetSelectedResourceSequenceIndex() const
{
	const auto candidates = _GetVisibleResourceSequenceCandidates();
	if (candidates.empty())
		return -1;

	for (size_t i = 0; i < candidates.size(); ++i)
	{
		if (_GetResourceSequenceKey(candidates[i]) == selected_resource_sequence_key_ ||
			(selected_resource_sequence_key_.empty() && _DoesResourceCandidateMatchSelectedClip(candidates[i])))
			return s_int(i);
	}

	return -1;
}

void CharacterStationScene::_SetSelectedResourceSequenceIndex(_int _index)
{
	const auto candidates = _GetVisibleResourceSequenceCandidates();
	if (candidates.empty())
		return;

	const auto clamped = std::clamp(_index, 0, s_int(candidates.size()) - 1);
	selected_resource_sequence_key_ = _GetResourceSequenceKey(candidates[clamped]);
	status_text_ = L"Selected resource sequence. Press Apply Res to update the current clip.";
	status_color_ = Palette::White;
}

void CharacterStationScene::_MoveResourceSequencePage(_int _delta)
{
	const auto filtered = _GetFilteredResourceSequenceCandidates();
	const _int page_count = std::max(1, (s_int(filtered.size()) + kResourceSequenceVisibleCount - 1) / kResourceSequenceVisibleCount);
	resource_sequence_page_ = std::clamp(resource_sequence_page_ + _delta, 0, page_count - 1);
}

void CharacterStationScene::_FocusResourceSequenceOnSelectedClip()
{
	const auto* clip = _GetSelectedClipInfo();
	if (clip == nullptr)
		return;

	const auto candidates = _GetFilteredResourceSequenceCandidates();
	for (size_t i = 0; i < candidates.size(); ++i)
	{
		if (candidates[i].directory_ == clip->directory_ &&
			candidates[i].prefix_ == clip->prefix_)
		{
			selected_resource_sequence_key_ = _GetResourceSequenceKey(candidates[i]);
			resource_sequence_page_ = s_int(i) / kResourceSequenceVisibleCount;
			return;
		}
	}
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
	const auto* clips = _GetSelectedClipList();
	if (clips == nullptr || clips->empty())
		return nullptr;

	const auto index = std::min(selected_clip_index_, clips->size() - 1);
	return &(*clips)[index];
}

const std::vector<AnimationClipPathInfo>* CharacterStationScene::_GetSelectedClipList() const
{
	if (mode_ == CharacterStationMode::Playable)
	{
		const auto* info = _GetSelectedPlayableInfo();
		return info != nullptr ? &info->animation_clips_ : nullptr;
	}

	const auto* info = _GetSelectedEnemyInfo();
	return info != nullptr ? &info->animation_clips_ : nullptr;
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

	if (const auto* clips = _GetSelectedClipList(); clips != nullptr && !clips->empty())
		return L"Preview resource missing. animation_clips_ has no loadable frame.";

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

std::wstring CharacterStationScene::_GetDirtySummary() const
{
	return L"Dirty: Playable=" + std::wstring(_IsPlayableDirty() ? L"yes" : L"no") +
		L", Enemy=" + std::wstring(_IsEnemyDirty() ? L"yes" : L"no") +
		L", Current=" + std::wstring(_IsCurrentDirty() ? L"yes" : L"no");
}

std::wstring CharacterStationScene::_GetCurrentDiffSummary() const
{
	const auto* current = _GetSelectedUnitInfo();
	if (current == nullptr)
		return L"Diff: no selection.";

	std::vector<std::wstring> changes;
	const json current_json = (mode_ == CharacterStationMode::Playable)
		? json(*_GetSelectedPlayableInfo())
		: json(*_GetSelectedEnemyInfo());

	if (mode_ == CharacterStationMode::Playable)
	{
		const auto it = baseline_playable_table_.find(selected_playable_id_);
		if (it == baseline_playable_table_.end())
			return L"Diff: new unsaved playable record.";

		const json baseline_json = it->second;
		for (const auto& [key, value] : current_json.items())
		{
			const auto baseline_value = baseline_json.contains(key) ? baseline_json.at(key) : json();
			if (baseline_value != value)
				changes.push_back(_UtilFunc::ToWString(key) + L": " + ToJsonShortText(baseline_value) + L" -> " + ToJsonShortText(value));
		}
	}
	else
	{
		const auto it = baseline_enemy_table_.find(selected_enemy_id_);
		if (it == baseline_enemy_table_.end())
			return L"Diff: new unsaved enemy record.";

		const json baseline_json = it->second;
		for (const auto& [key, value] : current_json.items())
		{
			const auto baseline_value = baseline_json.contains(key) ? baseline_json.at(key) : json();
			if (baseline_value != value)
				changes.push_back(_UtilFunc::ToWString(key) + L": " + ToJsonShortText(baseline_value) + L" -> " + ToJsonShortText(value));
		}
	}

	if (changes.empty())
		return L"Diff: no changes in current record.";

	std::wstring text = L"Diff: " + std::to_wstring(changes.size()) + L" field(s)";
	const auto limit = std::min<size_t>(changes.size(), 5);
	for (size_t i = 0; i < limit; ++i)
		text += L"\n- " + changes[i];
	if (changes.size() > limit)
		text += L"\n- ...";
	return text;
}

std::wstring CharacterStationScene::_GetValidationReport() const
{
	std::vector<std::wstring> issues;

	auto append_issue = [&issues](const std::wstring& _issue)
	{
		if (issues.size() < 14)
			issues.push_back(_issue);
	};

	auto validate_clip_list = [this, &append_issue](
		const std::wstring& _owner_label,
		const std::vector<AnimationClipPathInfo>& _clips)
	{
		std::set<std::string> clip_names;
		for (size_t i = 0; i < _clips.size(); ++i)
		{
			const auto& clip = _clips[i];
			const auto prefix = _owner_label + L" clip#" + std::to_wstring(i) + L" ";
			if (clip.clip_name_.empty())
				append_issue(prefix + L"has empty clip_name_.");
			if (!clip.clip_name_.empty() && !clip_names.insert(clip.clip_name_).second)
				append_issue(prefix + L"duplicates clip_name_: " + _UtilFunc::ToWString(clip.clip_name_));
			if (clip.directory_.empty())
				append_issue(prefix + L"has empty directory_.");
			if (clip.prefix_.empty())
				append_issue(prefix + L"has empty prefix_.");
			if (clip.start_index_ > clip.end_index_)
				append_issue(prefix + L"has start_index_ > end_index_.");
			if (clip.fps_ <= 0.f)
				append_issue(prefix + L"has fps_ <= 0.");

			_int missing_count = 0;
			const auto start = std::min(clip.start_index_, clip.end_index_);
			const auto end = std::max(clip.start_index_, clip.end_index_);
			for (_int frame = start; frame <= end; ++frame)
			{
				if (!_FramePathExists(_BuildClipFramePath(clip, frame)))
					++missing_count;
			}
			if (missing_count > 0)
				append_issue(prefix + L"missing frames: " + std::to_wstring(missing_count));
		}
	};

	for (const auto& [id, info] : _CharacterDagaMgr.GetTable())
	{
		const auto label = L"Playable #" + std::to_wstring(id);
		if (info.name_.empty())
			append_issue(label + L" has empty name_.");
		if (info.body_size_ <= 0.f)
			append_issue(label + L" has body_size_ <= 0.");
		if (info.animation_clips_.empty())
			append_issue(label + L" has no animation_clips_.");
		validate_clip_list(label, info.animation_clips_);
	}

	for (const auto& [id, info] : _EnemyDataMgr.GetTable())
	{
		const auto label = L"Enemy #" + std::to_wstring(id);
		if (info.name_.empty())
			append_issue(label + L" has empty name_.");
		if (info.body_size_ <= 0.f)
			append_issue(label + L" has body_size_ <= 0.");
		if (!info.image_path_.empty() && !std::filesystem::exists(std::filesystem::path(info.image_path_)))
			append_issue(label + L" legacy image_path_ missing: " + _UtilFunc::ToWString(info.image_path_));
		if (HasEnemyAbilityFlag(info.ability_flags_, EnemyAbilityFlags::ProjectileAttack) &&
			info.projectile_pattern_ == ProjectilePattern::Undefined)
			append_issue(label + L" projectile ability is enabled but pattern is Undefined.");
		if (info.projectile_pattern_ != ProjectilePattern::Undefined && info.projectile_speed_ <= 0.f)
			append_issue(label + L" projectile pattern is set but projectile_speed_ <= 0.");
		validate_clip_list(label, info.animation_clips_);
	}

	auto validate_raw_duplicate_ids = [&append_issue](const char* _path, const std::wstring& _label)
	{
		try
		{
			std::ifstream file(_path);
			if (!file.is_open())
				return;
			json j;
			file >> j;
			std::set<_uint> ids;
			for (const auto& item : j)
			{
				if (!item.contains("id_"))
					continue;
				const auto id = item["id_"].get<_uint>();
				if (!ids.insert(id).second)
					append_issue(_label + L" duplicate raw id_: " + std::to_wstring(id));
			}
		}
		catch (...)
		{
			append_issue(_label + L" raw duplicate-id check failed.");
		}
	};
	validate_raw_duplicate_ids(kPlayableCharacterPath, L"PlayableCharacter.json");
	validate_raw_duplicate_ids(kEnemyPath, L"Enemy.json");

	if (issues.empty())
		return L"Validation: OK";

	std::wstring text = L"Validation: " + std::to_wstring(issues.size()) + L"+ issue(s)";
	for (const auto& issue : issues)
		text += L"\n- " + issue;
	return text;
}

std::wstring CharacterStationScene::_GetFrameCheckSummary() const
{
	const auto* clip = _GetSelectedClipInfo();
	if (clip == nullptr)
		return L"Frames: no selected clip.";

	const auto start = std::min(clip->start_index_, clip->end_index_);
	const auto end = std::max(clip->start_index_, clip->end_index_);
	_int missing_count = 0;
	for (_int frame = start; frame <= end; ++frame)
	{
		if (!_FramePathExists(_BuildClipFramePath(*clip, frame)))
			++missing_count;
	}

	return L"Frames: range=" + std::to_wstring(start) + L"-" + std::to_wstring(end) +
		L", total=" + std::to_wstring(std::max(0, end - start + 1)) +
		L", missing=" + std::to_wstring(missing_count);
}

_float CharacterStationScene::_GetRuntimeBodyRadiusX() const
{
	const auto* unit_info = _GetSelectedUnitInfo();
	if (unit_info == nullptr)
		return 0.f;

	if (mode_ == CharacterStationMode::Playable)
		return kStagePlayerBodyRadiusX;

	return unit_info->body_size_ * kEnemyCombatColliderWidthRatio;
}

_float CharacterStationScene::_GetRuntimeBodyYRatio() const
{
	if (mode_ == CharacterStationMode::Enemy && preview_sprite_ != nullptr)
	{
		const auto metrics = SpriteRenderUtils::MakeWorldSpriteDrawMetrics(*preview_sprite_);
		return std::max(0.1f, SpriteRenderUtils::GetNaturalVisibleHeightRatio(metrics));
	}

	return kDefaultColliderYRatio;
}

_float CharacterStationScene::_GetRuntimeBodyCenterOffsetY() const
{
	if (mode_ != CharacterStationMode::Enemy)
		return 0.f;

	return -_GetCurrentBodySize() * _GetRuntimeBodyYRatio() * _ScreenSystem.GetWorldResourceScale() * 0.5f;
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

const SpriteResource* CharacterStationScene::_TryLoadAnimationPreview(std::wstring& _out_path) const
{
	_out_path.clear();

	const auto* clips = _GetSelectedClipList();
	if (clips == nullptr || clips->empty())
		return nullptr;

	if (const auto* selected_clip = _GetSelectedClipInfo())
	{
		const auto frame_path = _BuildClipFramePath(*selected_clip, _ResolvePreviewFrameIndex(*selected_clip));
		const auto* sprite = _TryLoadPreviewSprite(frame_path);
		if (sprite != nullptr)
		{
			_out_path = frame_path;
			return sprite;
		}
	}

	for (const auto& clip_info : *clips)
	{
		const auto frame_path = _BuildClipFramePath(clip_info, clip_info.start_index_);
		const auto* sprite = _TryLoadPreviewSprite(frame_path);
		if (sprite == nullptr)
			continue;

		_out_path = frame_path;
		return sprite;
	}

	return nullptr;
}

const SpriteResource* CharacterStationScene::_TryLoadLegacyPreview(std::wstring& _out_path) const
{
	_out_path.clear();
	const auto* unit_info = _GetSelectedUnitInfo();
	if (unit_info == nullptr || unit_info->image_path_.empty())
		return nullptr;

	const std::wstring image_path = _UtilFunc::ToWString(unit_info->image_path_);
	const auto* sprite = _TryLoadPreviewSprite(image_path);
	if (sprite == nullptr)
		return nullptr;

	_out_path = image_path;
	return sprite;
}

std::wstring CharacterStationScene::_BuildClipFramePath(const AnimationClipPathInfo& _clip_info, _int _frame_index) const
{
	const auto sequence_path = SpriteAnimationBuilder::BuildSequenceFramePath(
		_UtilFunc::ToWString(_clip_info.directory_),
		_UtilFunc::ToWString(_clip_info.prefix_),
		_frame_index);

	if (std::filesystem::exists(std::filesystem::path(sequence_path)))
		return sequence_path;

	const auto start = std::min(_clip_info.start_index_, _clip_info.end_index_);
	const auto end = std::max(_clip_info.start_index_, _clip_info.end_index_);
	if (start == end)
	{
		const auto single_frame_path =
			_UtilFunc::ToWString(_clip_info.directory_) +
			_UtilFunc::ToWString(_clip_info.prefix_) +
			L".png";
		if (std::filesystem::exists(std::filesystem::path(single_frame_path)))
			return single_frame_path;
	}

	return sequence_path;
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

_bool CharacterStationScene::_FramePathExists(const std::wstring& _path) const
{
	if (_path.empty())
		return false;

	return std::filesystem::exists(std::filesystem::path(_path));
}

_bool CharacterStationScene::_SelectClipByName(const std::wstring& _clip_name)
{
	const auto* clips = _GetSelectedClipList();
	if (clips == nullptr)
		return false;

	for (size_t i = 0; i < clips->size(); ++i)
	{
		if (_UtilFunc::ToWString((*clips)[i].clip_name_) == _clip_name)
		{
			selected_clip_index_ = i;
			selected_resource_sequence_key_.clear();
			_ResetPreviewAnimation();
			_FocusResourceSequenceOnSelectedClip();
			return true;
		}
	}

	return false;
}

std::string CharacterStationScene::_GetResourceSequenceKey(const ResourceSequenceCandidate& _candidate) const
{
	return _candidate.directory_ + "|" + _candidate.prefix_;
}

_bool CharacterStationScene::_DoesResourceCandidateMatchSelectedClip(const ResourceSequenceCandidate& _candidate) const
{
	const auto* clip = _GetSelectedClipInfo();
	return clip != nullptr &&
		_candidate.directory_ == clip->directory_ &&
		_candidate.prefix_ == clip->prefix_;
}

_bool CharacterStationScene::_DoesResourceCandidateMatchCurrentCharacter(const ResourceSequenceCandidate& _candidate) const
{
	const auto* unit_info = _GetSelectedUnitInfo();
	if (unit_info == nullptr || unit_info->name_.empty())
		return true;

	const std::wstring needle = ToLowerCopy(_UtilFunc::ToWString(unit_info->name_));
	const std::wstring haystack = ToLowerCopy(
		_UtilFunc::ToWString(_candidate.directory_) +
		L" " +
		_UtilFunc::ToWString(_candidate.prefix_));

	return haystack.find(needle) != std::wstring::npos;
}

_bool CharacterStationScene::_DoesResourceCandidateMatchFilter(const ResourceSequenceCandidate& _candidate) const
{
	const auto tokens = SplitFilterTokens(resource_sequence_filter_);
	if (tokens.empty())
		return true;

	const std::wstring haystack = ToLowerCopy(
		TailPathSegments(_candidate.directory_, 6) +
		L" " +
		_UtilFunc::ToWString(_candidate.directory_) +
		L" " +
		_UtilFunc::ToWString(_candidate.prefix_));

	for (const auto& token : tokens)
	{
		if (haystack.find(token) == std::wstring::npos)
			return false;
	}

	return true;
}

_bool CharacterStationScene::_TryGetSelectedResourceSequenceCandidate(ResourceSequenceCandidate& _out_candidate) const
{
	const auto candidates = _GetVisibleResourceSequenceCandidates();
	const _int index = _GetSelectedResourceSequenceIndex();
	if (index < 0 || index >= s_int(candidates.size()))
		return false;

	_out_candidate = candidates[index];
	return true;
}

void CharacterStationScene::_UpdateSelectedPlayable(const std::function<void(PlayableCharacterJsonInfo&)>& _mutator)
{
	const auto* current = _CharacterDagaMgr.GetData(selected_playable_id_);
	if (current == nullptr || !_mutator)
		return;

	auto copy = *current;
	_mutator(copy);
	_CharacterDagaMgr.SetData(copy);
	_OnDataEdited(L"Playable data edited.");
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
	_OnDataEdited(L"Enemy data edited.");
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

	if (mode_ == CharacterStationMode::Playable)
	{
		_UpdateSelectedPlayable([&](PlayableCharacterJsonInfo& _info)
		{
			if (_info.animation_clips_.empty())
				return;

			const auto index = std::min(selected_clip_index_, _info.animation_clips_.size() - 1);
			_mutator(_info.animation_clips_[index]);
		});
	}
	else
	{
		_UpdateSelectedEnemy([&](EnemyJsonInfo& _info)
		{
			if (_info.animation_clips_.empty())
				return;

			const auto index = std::min(selected_clip_index_, _info.animation_clips_.size() - 1);
			_mutator(_info.animation_clips_[index]);
		});
	}

	_ResetPreviewAnimation();
}

void CharacterStationScene::_AddClip()
{
	auto clip = _MakeDefaultClip("idle");
	if (const auto* selected_clip = _GetSelectedClipInfo())
	{
		clip = *selected_clip;
		clip.clip_name_ = clip.clip_name_.empty() ? "new_clip" : clip.clip_name_ + "_new";
	}

	if (mode_ == CharacterStationMode::Playable)
	{
		_UpdateSelectedPlayable([&](PlayableCharacterJsonInfo& _info)
		{
			_info.animation_clips_.push_back(clip);
			selected_clip_index_ = _info.animation_clips_.empty() ? 0 : _info.animation_clips_.size() - 1;
		});
	}
	else
	{
		_UpdateSelectedEnemy([&](EnemyJsonInfo& _info)
		{
			_info.animation_clips_.push_back(clip);
			selected_clip_index_ = _info.animation_clips_.empty() ? 0 : _info.animation_clips_.size() - 1;
		});
	}

	selected_preview_state_index_ = 0;
	_ResetPreviewAnimation();
}

void CharacterStationScene::_DuplicateClip()
{
	const auto* selected_clip = _GetSelectedClipInfo();
	if (selected_clip == nullptr)
	{
		_AddClip();
		return;
	}

	auto duplicated = *selected_clip;
	duplicated.clip_name_ = duplicated.clip_name_.empty() ? "clip_copy" : duplicated.clip_name_ + "_copy";

	if (mode_ == CharacterStationMode::Playable)
	{
		_UpdateSelectedPlayable([&](PlayableCharacterJsonInfo& _info)
		{
			_info.animation_clips_.push_back(duplicated);
			selected_clip_index_ = _info.animation_clips_.size() - 1;
		});
	}
	else
	{
		_UpdateSelectedEnemy([&](EnemyJsonInfo& _info)
		{
			_info.animation_clips_.push_back(duplicated);
			selected_clip_index_ = _info.animation_clips_.size() - 1;
		});
	}

	selected_preview_state_index_ = 0;
	_ResetPreviewAnimation();
}

void CharacterStationScene::_RemoveClip()
{
	if (mode_ == CharacterStationMode::Playable)
	{
		_UpdateSelectedPlayable([&](PlayableCharacterJsonInfo& _info)
		{
			if (_info.animation_clips_.empty())
				return;
			const auto index = std::min(selected_clip_index_, _info.animation_clips_.size() - 1);
			_info.animation_clips_.erase(_info.animation_clips_.begin() + index);
			selected_clip_index_ = _info.animation_clips_.empty() ? 0 : std::min(index, _info.animation_clips_.size() - 1);
		});
	}
	else
	{
		_UpdateSelectedEnemy([&](EnemyJsonInfo& _info)
		{
			if (_info.animation_clips_.empty())
				return;
			const auto index = std::min(selected_clip_index_, _info.animation_clips_.size() - 1);
			_info.animation_clips_.erase(_info.animation_clips_.begin() + index);
			selected_clip_index_ = _info.animation_clips_.empty() ? 0 : std::min(index, _info.animation_clips_.size() - 1);
		});
	}

	selected_preview_state_index_ = 0;
	_ResetPreviewAnimation();
}

void CharacterStationScene::_ApplyResourceCandidateToSelectedClip(const ResourceSequenceCandidate& _candidate)
{
	if (_GetSelectedClipInfo() == nullptr)
		_AddClip();

	_UpdateSelectedClip([&](AnimationClipPathInfo& _clip)
	{
		_clip.directory_ = _candidate.directory_;
		_clip.prefix_ = _candidate.prefix_;
		_clip.start_index_ = _candidate.start_index_;
		_clip.end_index_ = _candidate.end_index_;
		if (_clip.clip_name_.empty() || _clip.clip_name_ == "new_clip")
			_clip.clip_name_ = MakeClipNameFromPrefix(_candidate.prefix_);
	});

	selected_resource_sequence_key_ = _GetResourceSequenceKey(_candidate);
	_FocusResourceSequenceOnSelectedClip();
}

AnimationClipPathInfo CharacterStationScene::_MakeDefaultClip(const std::string& _name_hint) const
{
	AnimationClipPathInfo clip{};
	clip.clip_name_ = _name_hint.empty() ? "idle" : _name_hint;
	clip.directory_ = "Data/Resources/Textures/Characters/";
	clip.prefix_ = "Idle_";
	clip.start_index_ = 1;
	clip.end_index_ = 1;
	clip.fps_ = 8.f;
	clip.loop_ = true;

	const auto candidates = _GetResourceSequenceCandidates();
	if (!candidates.empty())
	{
		clip.directory_ = candidates.front().directory_;
		clip.prefix_ = candidates.front().prefix_;
		clip.start_index_ = candidates.front().start_index_;
		clip.end_index_ = candidates.front().end_index_;
		clip.clip_name_ = MakeClipNameFromPrefix(candidates.front().prefix_);
	}

	return clip;
}

void CharacterStationScene::_CreateNewPlayable()
{
	PlayableCharacterJsonInfo info{};
	info.id_ = _GetNextPlayableId();
	info.name_ = "NewPlayable" + std::to_string(info.id_);
	info.body_size_ = 32.f;
	info.attack_speed_ = 1.0;
	info.hp_ = 30.f;
	info.contact_damage_ = 4.f;
	info.image_path_.clear();
	info.attack_range_ = 60.f;
	info.collector_size_ = 80.f;
	info.move_speed_max_ = 220.f;
	info.acceleration_ = 900.f;
	info.friction_ = 9.f;
	info.nav_boundary_mode_ = NavBoundaryMode::ContainFootprint;
	info.nav_footprint_radius_ = 10.f;
	info.animation_clips_.push_back(_MakeDefaultClip("idle"));

	_CharacterDagaMgr.SetData(info);
	mode_ = CharacterStationMode::Playable;
	selected_playable_id_ = info.id_;
	selected_clip_index_ = 0;
	_OnDataEdited(L"New playable created.");
	_ResetPreviewAnimation();
}

void CharacterStationScene::_CreateNewEnemy()
{
	EnemyJsonInfo info{};
	info.id_ = _GetNextEnemyId();
	info.name_ = "NewEnemy" + std::to_string(info.id_);
	info.body_size_ = 32.f;
	info.attack_speed_ = 1.0;
	info.hp_ = 20.f;
	info.contact_damage_ = 3.f;
	info.image_path_ = "Data/Resources/Textures/Characters/Enemy-Lv1.png";
	info.tier_ = EnemyTier::Normal;
	info.role_ = EnemySpecialRole::Undefined;
	info.exp_reward_ = 1;
	info.dust_reward_ = 1;
	info.dust_resource_count_ = 1;
	info.movement_pattern_ = MovementPattern::Target;
	info.move_speed_unit_ = 3;
	info.nav_boundary_mode_ = NavBoundaryMode::ContainFootprint;
	info.nav_footprint_radius_ = 10.f;
	info.ability_flags_ = EnemyAbilityFlags::ContactAttack;
	info.contact_impact_ = 0.3f;
	info.contact_knockback_distance_world_px_ = 24.f;
	info.contact_knockback_duration_sec_ = 0.12f;
	info.contact_camera_shake_scale_ = 0.85f;

	_EnemyDataMgr.SetData(info);
	mode_ = CharacterStationMode::Enemy;
	selected_enemy_id_ = info.id_;
	selected_clip_index_ = 0;
	_OnDataEdited(L"New enemy created.");
	_ResetPreviewAnimation();
}

void CharacterStationScene::_DuplicateCurrentAsNewId()
{
	if (mode_ == CharacterStationMode::Playable)
	{
		const auto* current = _GetSelectedPlayableInfo();
		if (current == nullptr)
			return;
		auto copy = *current;
		copy.id_ = _GetNextPlayableId();
		copy.name_ += "_Copy";
		_CharacterDagaMgr.SetData(copy);
		selected_playable_id_ = copy.id_;
	}
	else
	{
		const auto* current = _GetSelectedEnemyInfo();
		if (current == nullptr)
			return;
		auto copy = *current;
		copy.id_ = _GetNextEnemyId();
		copy.name_ += "_Copy";
		_EnemyDataMgr.SetData(copy);
		selected_enemy_id_ = copy.id_;
	}

	selected_clip_index_ = 0;
	_OnDataEdited(L"Duplicated current character as a new id.");
	_ResetPreviewAnimation();
}

void CharacterStationScene::_ApplyBalancedPreset()
{
	if (mode_ == CharacterStationMode::Playable)
	{
		_UpdateSelectedPlayable([](PlayableCharacterJsonInfo& _info)
		{
			_info.body_size_ = 32.f;
			_info.hp_ = 35.f;
			_info.contact_damage_ = 5.f;
			_info.attack_speed_ = 1.0;
			_info.attack_range_ = 64.f;
			_info.collector_size_ = 80.f;
			_info.move_speed_max_ = 230.f;
			_info.acceleration_ = 900.f;
			_info.friction_ = 9.f;
		});
	}
	else
	{
		_UpdateSelectedEnemy([](EnemyJsonInfo& _info)
		{
			_info.role_ = EnemySpecialRole::Undefined;
			_info.body_size_ = 32.f;
			_info.hp_ = 24.f;
			_info.contact_damage_ = 3.f;
			_info.attack_speed_ = 1.0;
			_info.movement_pattern_ = MovementPattern::Target;
			_info.move_speed_unit_ = 3;
			_info.ability_flags_ = EnemyAbilityFlags::ContactAttack;
			_info.projectile_pattern_ = ProjectilePattern::Undefined;
		});
	}
}

void CharacterStationScene::_ApplyFastPreset()
{
	if (mode_ == CharacterStationMode::Playable)
	{
		_UpdateSelectedPlayable([](PlayableCharacterJsonInfo& _info)
		{
			_info.body_size_ = 28.f;
			_info.hp_ = 25.f;
			_info.contact_damage_ = 4.f;
			_info.move_speed_max_ = 310.f;
			_info.acceleration_ = 1300.f;
			_info.friction_ = 12.f;
		});
	}
	else
	{
		_UpdateSelectedEnemy([](EnemyJsonInfo& _info)
		{
			_info.role_ = EnemySpecialRole::Undefined;
			_info.body_size_ = 26.f;
			_info.hp_ = 14.f;
			_info.contact_damage_ = 3.f;
			_info.movement_pattern_ = MovementPattern::Target;
			_info.move_speed_unit_ = 6;
			_info.ability_flags_ = EnemyAbilityFlags::ContactAttack;
		});
	}
}

void CharacterStationScene::_ApplyShooterPreset()
{
	if (mode_ == CharacterStationMode::Enemy)
	{
		_UpdateSelectedEnemy([](EnemyJsonInfo& _info)
		{
			_info.role_ = EnemySpecialRole::Shooter;
			_info.body_size_ = 32.f;
			_info.hp_ = 24.f;
			_info.contact_damage_ = 3.f;
			_info.attack_speed_ = 1.0;
			_info.attack_range_ = 180.f;
			_info.ability_flags_ = EnemyAbilityFlags::ContactAttack | EnemyAbilityFlags::ProjectileAttack;
			_info.projectile_pattern_ = ProjectilePattern::Direct;
			_info.projectile_damage_ = 3.f;
			_info.projectile_speed_ = 160.f;
			_info.projectile_spawn_offset_x_ = 20.f;
			_info.projectile_spawn_offset_y_ = 0.f;
		});
		return;
	}

	status_text_ = L"Shooter preset is for Enemy mode.";
	status_color_ = Palette::Orange;
}

void CharacterStationScene::_ApplyTankPreset()
{
	if (mode_ == CharacterStationMode::Enemy)
	{
		_UpdateSelectedEnemy([](EnemyJsonInfo& _info)
		{
			_info.role_ = EnemySpecialRole::Tank;
			_info.body_size_ = 60.f;
			_info.hp_ = 70.f;
			_info.contact_damage_ = 3.f;
			_info.movement_pattern_ = MovementPattern::Directional;
			_info.move_speed_unit_ = 1;
			_info.nav_boundary_mode_ = NavBoundaryMode::ContainVisualBounds;
			_info.nav_footprint_radius_ = 14.f;
			_info.nav_visual_margin_x_ = 14.f;
			_info.nav_visual_margin_y_ = 10.f;
			_info.ability_flags_ = EnemyAbilityFlags::ContactAttack;
		});
		return;
	}

	_UpdateSelectedPlayable([](PlayableCharacterJsonInfo& _info)
	{
		_info.body_size_ = 42.f;
		_info.hp_ = 55.f;
		_info.contact_damage_ = 6.f;
		_info.move_speed_max_ = 185.f;
		_info.acceleration_ = 650.f;
		_info.friction_ = 8.f;
	});
}

void CharacterStationScene::_RevertCurrent()
{
	if (mode_ == CharacterStationMode::Playable)
	{
		const auto it = baseline_playable_table_.find(selected_playable_id_);
		if (it == baseline_playable_table_.end())
		{
			_CharacterDagaMgr.RemoveData(selected_playable_id_);
			_RefreshSelection(true);
		}
		else
		{
			_CharacterDagaMgr.SetData(it->second);
		}
	}
	else
	{
		const auto it = baseline_enemy_table_.find(selected_enemy_id_);
		if (it == baseline_enemy_table_.end())
		{
			_EnemyDataMgr.RemoveData(selected_enemy_id_);
			_RefreshSelection(true);
		}
		else
		{
			_EnemyDataMgr.SetData(it->second);
		}
	}

	selected_clip_index_ = 0;
	pending_exit_confirm_ = false;
	pending_reload_confirm_ = false;
	status_text_ = L"Current character reverted to last loaded/saved data.";
	status_color_ = Palette::Green;
	_ResetPreviewAnimation();
}

void CharacterStationScene::_RevertMode()
{
	if (mode_ == CharacterStationMode::Playable)
	{
		_CharacterDagaMgr.Clear();
		for (const auto& [id, info] : baseline_playable_table_)
			_CharacterDagaMgr.SetData(info);
	}
	else
	{
		_EnemyDataMgr.Clear();
		for (const auto& [id, info] : baseline_enemy_table_)
			_EnemyDataMgr.SetData(info);
	}

	_RefreshSelection(true);
	status_text_ = L"Current mode reverted to last loaded/saved data.";
	status_color_ = Palette::Green;
}

_uint CharacterStationScene::_GetNextPlayableId() const
{
	_uint next_id = 1;
	for (const auto& [id, info] : _CharacterDagaMgr.GetTable())
	{
		(void)info;
		next_id = std::max(next_id, id + 1);
	}
	return next_id;
}

_uint CharacterStationScene::_GetNextEnemyId() const
{
	_uint next_id = 1;
	for (const auto& [id, info] : _EnemyDataMgr.GetTable())
	{
		(void)info;
		next_id = std::max(next_id, id + 1);
	}
	return next_id;
}

void CharacterStationScene::_OnDataEdited(const std::wstring& _message)
{
	pending_exit_confirm_ = false;
	pending_reload_confirm_ = false;
	if (!_message.empty())
	{
		status_text_ = _message;
		status_color_ = Palette::White;
	}
}

_bool CharacterStationScene::_IsPlayableDirty() const
{
	if (baseline_playable_table_.size() != _CharacterDagaMgr.GetTable().size())
		return true;

	for (const auto& [id, info] : _CharacterDagaMgr.GetTable())
	{
		const auto it = baseline_playable_table_.find(id);
		if (it == baseline_playable_table_.end())
			return true;
		if (DumpJsonData(info) != DumpJsonData(it->second))
			return true;
	}

	return false;
}

_bool CharacterStationScene::_IsEnemyDirty() const
{
	if (baseline_enemy_table_.size() != _EnemyDataMgr.GetTable().size())
		return true;

	for (const auto& [id, info] : _EnemyDataMgr.GetTable())
	{
		const auto it = baseline_enemy_table_.find(id);
		if (it == baseline_enemy_table_.end())
			return true;
		if (DumpJsonData(info) != DumpJsonData(it->second))
			return true;
	}

	return false;
}

_bool CharacterStationScene::_IsAnyDirty() const
{
	return _IsPlayableDirty() || _IsEnemyDirty();
}

_bool CharacterStationScene::_IsCurrentDirty() const
{
	if (mode_ == CharacterStationMode::Playable)
	{
		const auto* current = _GetSelectedPlayableInfo();
		if (current == nullptr)
			return false;
		const auto it = baseline_playable_table_.find(selected_playable_id_);
		return it == baseline_playable_table_.end() || DumpJsonData(*current) != DumpJsonData(it->second);
	}

	const auto* current = _GetSelectedEnemyInfo();
	if (current == nullptr)
		return false;
	const auto it = baseline_enemy_table_.find(selected_enemy_id_);
	return it == baseline_enemy_table_.end() || DumpJsonData(*current) != DumpJsonData(it->second);
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
	const auto preview_height_ratio = mode_ == CharacterStationMode::Enemy
		? SpriteRenderUtils::GetNaturalVisibleHeightRatio(metrics)
		: kDefaultColliderYRatio;
	const _RectF dest_rect = SpriteRenderUtils::BuildWorldSpriteDestRect(
		center,
		std::max(1.f, _GetCurrentBodySize()),
		metrics,
		_ScreenSystem.GetWorldResourceScale(),
		preview_height_ratio);

	const _RectF source_rect(
		preview_sprite_->image_rect.X,
		preview_sprite_->image_rect.Y,
		preview_sprite_->image_rect.X + preview_sprite_->image_rect.Width,
		preview_sprite_->image_rect.Y + preview_sprite_->image_rect.Height);

	_DrawFunc::DrawTexture(preview_sprite_->image, dest_rect, source_rect);
	if (show_frame_bounds_guide_)
		_DrawFunc::DrawRectangle(dest_rect, Palette::LightBlue, 1.25f);
}

void CharacterStationScene::_DrawPreviewGuides(const _Point& _center) const
{
	const _float body_rx = _GetRuntimeBodyRadiusX();
	const _float body_ry = body_rx * _GetRuntimeBodyYRatio();
	const _Point body_center{
		_center.x,
		s_int(std::round(_center.y + _GetRuntimeBodyCenterOffsetY()))
	};
	if (show_body_guide_ && body_rx > 0.f && body_ry > 0.f)
	{
		_DrawFunc::DrawEllipse(
			_RectF(
				s_float(body_center.x) - body_rx,
				s_float(body_center.y) - body_ry,
				s_float(body_center.x) + body_rx,
				s_float(body_center.y) + body_ry),
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

	if (show_nav_guide_ && footprint_radius > 0.f)
	{
		const _Point footprint_center{ _center.x, s_int(std::round(_center.y + footprint_offset_y)) };
		_DrawFunc::DrawCircle(footprint_center, footprint_radius, Palette::Yellow, 1.5f);
	}

	if (show_visual_bounds_guide_)
	{
		const _float margin_x = playable_info != nullptr
			? playable_info->nav_visual_margin_x_
			: (enemy_info != nullptr ? enemy_info->nav_visual_margin_x_ : 0.f);
		const _float margin_y = playable_info != nullptr
			? playable_info->nav_visual_margin_y_
			: (enemy_info != nullptr ? enemy_info->nav_visual_margin_y_ : 0.f);
		const _float half_w = std::max(8.f, _GetCurrentBodySize() * 0.5f + margin_x);
		const _float half_h = std::max(8.f, _GetCurrentBodySize() * 0.5f + margin_y);
		_DrawFunc::DrawRectangle(
			_RectF(
				s_float(_center.x) - half_w,
				s_float(_center.y) - half_h,
				s_float(_center.x) + half_w,
				s_float(_center.y) + half_h),
			Palette::Orange,
			1.25f);
	}

	if (show_attack_range_guide_)
	{
		const _float attack_range = playable_info != nullptr
			? playable_info->attack_range_
			: (enemy_info != nullptr ? enemy_info->attack_range_ : 0.f);
		if (attack_range > 0.f)
			_DrawFunc::DrawCircle(_center, attack_range, Palette::Maroon, 1.25f);
	}

	if (show_collector_range_guide_ && playable_info != nullptr && playable_info->collector_size_ > 0.f)
		_DrawFunc::DrawCircle(_center, playable_info->collector_size_, Palette::AshGray, 1.25f);

	if (show_muzzle_guide_)
		_DrawProjectileMuzzleGuide(_center);

	if (show_projectile_test_guide_)
		_DrawProjectileTestGuide(_center);

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

void CharacterStationScene::_DrawProjectileTestGuide(const _Point& _center) const
{
	const auto* enemy_info = _GetSelectedEnemyInfo();
	if (enemy_info == nullptr)
		return;

	if (!HasEnemyAbilityFlag(enemy_info->ability_flags_, EnemyAbilityFlags::ProjectileAttack) ||
		enemy_info->projectile_pattern_ == ProjectilePattern::Undefined)
	{
		return;
	}

	const auto muzzle = _GetProjectileMuzzleOffset();
	const _Point muzzle_point{
		s_int(std::round(_center.x + muzzle.x)),
		s_int(std::round(_center.y + muzzle.y))
	};

	const _float preview_range = std::max(40.f, enemy_info->attack_range_);
	const _Vector2 direction(1.f, -0.18f);
	const auto normalized = direction.Normalized();
	const _Point end_point{
		s_int(std::round(muzzle_point.x + normalized.x * preview_range)),
		s_int(std::round(muzzle_point.y + normalized.y * preview_range))
	};

	_DrawFunc::DrawLine(muzzle_point, end_point, Palette::White, 1.25f);

	const auto speed = std::max(1.f, enemy_info->projectile_speed_);
	const auto cycle_time = std::max(0.5, s_double(preview_range / speed));
	const auto t = s_float(std::fmod(projectile_preview_elapsed_, cycle_time) / cycle_time);
	const _Point projectile_point{
		s_int(std::round(muzzle_point.x + normalized.x * preview_range * t)),
		s_int(std::round(muzzle_point.y + normalized.y * preview_range * t))
	};

	_DrawFunc::FillCircle(projectile_point, 5.f, Palette::LightBlue);
	_DrawFunc::DrawString(
		_Point{ end_point.x + 8, end_point.y - 8 },
		L"Projectile test",
		Palette::White,
		12.f,
		false);
}
