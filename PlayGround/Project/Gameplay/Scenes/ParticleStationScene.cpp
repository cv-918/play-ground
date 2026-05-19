#include "framework.h"
#include "ParticleStationScene.h"

#include <cwctype>
#include <filesystem>
#include <iomanip>
#include <sstream>

#include "EngineSystems/Render/ScreenSystem.h"

#include "GamePlaySystems/GameDataLoader.h"
#include "GamePlaySystems/Json/ParticleDataManager.h"
#include "GamePlaySystems/Json/ParticleEventSetDataManager.h"

namespace
{
	constexpr char kParticleEventSetPath[] = "Data/ParticleEventSet.json";
	constexpr wchar_t kParticleTextureRoot[] = L"Data/Resources/Textures/Particles";
	constexpr _uint kDefaultEventSetId = 3001;
	constexpr _uint kDefaultBurstCount = 8;

	const std::wstring kEventSetWindowName = L"ParticleStation / EventSet";
	const std::wstring kEventEditorWindowName = L"ParticleStation / Event";
	const std::wstring kEmptyTextureLabel = L"<empty>";

	std::wstring FormatFloat(_float _value, _int _precision = 2)
	{
		std::wstringstream stream;
		stream << std::fixed << std::setprecision(_precision) << _value;
		return stream.str();
	}

	_float NormalizeDegree(_float _value)
	{
		while (_value > 180.f)
			_value -= 360.f;
		while (_value < -180.f)
			_value += 360.f;
		return _value;
	}

	std::wstring GetPlaybackTypeLabel(ParticleEventPlaybackType _type)
	{
		switch (_type)
		{
		case ParticleEventPlaybackType::Burst:
			return L"Burst";
		case ParticleEventPlaybackType::Emitter:
			return L"Emitter";
		}

		return L"Unknown";
	}

	std::wstring GetDirectionModeLabel(ParticleEventDirectionMode _mode)
	{
		switch (_mode)
		{
		case ParticleEventDirectionMode::World:
			return L"World";
		case ParticleEventDirectionMode::PlayContext:
			return L"PlayContext";
		}

		return L"Unknown";
	}

	std::wstring GetShapeLabel(EmitterShape _shape)
	{
		switch (_shape)
		{
		case EmitterShape::Point:
			return L"Point";
		case EmitterShape::Circle:
			return L"Circle";
		case EmitterShape::Box:
			return L"Box";
		}

		return L"Unknown";
	}

	std::wstring GetEaseLabel(_MathFunc::EaseType _type)
	{
		switch (_type)
		{
		case _MathFunc::EaseType::Linear:
			return L"Linear";
		case _MathFunc::EaseType::InQuad:
			return L"InQuad";
		case _MathFunc::EaseType::OutQuad:
			return L"OutQuad";
		case _MathFunc::EaseType::InOutQuad:
			return L"InOutQuad";
		case _MathFunc::EaseType::InCubic:
			return L"InCubic";
		case _MathFunc::EaseType::OutCubic:
			return L"OutCubic";
		case _MathFunc::EaseType::InBack:
			return L"InBack";
		case _MathFunc::EaseType::OutBack:
			return L"OutBack";
		case _MathFunc::EaseType::InElastic:
			return L"InElastic";
		case _MathFunc::EaseType::OutElastic:
			return L"OutElastic";
		}

		return L"Unknown";
	}

	std::wstring GetTextureDisplayLabel(const std::wstring& _texture_key)
	{
		if (_texture_key.empty() || _texture_key == kEmptyTextureLabel)
			return kEmptyTextureLabel;

		const std::filesystem::path texture_path(_texture_key);
		const auto filename = texture_path.filename().wstring();
		return filename.empty() ? _texture_key : filename;
	}

	_bool IsTextureExtension(const std::filesystem::path& _path)
	{
		auto extension = _path.extension().wstring();
		std::transform(extension.begin(), extension.end(), extension.begin(),
			[](wchar_t _ch)
		{
			return static_cast<wchar_t>(std::towlower(_ch));
		});

		return extension == L".png" || extension == L".bmp" || extension == L".jpg" || extension == L".jpeg";
	}
}

_bool ParticleStationScene::Initialize()
{
	if (!__super::Initialize())
		return false;

	_RefreshTextureOptions();
	_LoadInitialSet();
	_SetStatus(L"ParticleStation ready. Use the DebugAssistant windows to edit and preview sets.");

	MAKE_INITIALIZED;
	return true;
}

_int ParticleStationScene::Update(_double _delta_time)
{
	const auto ret = __super::Update(_delta_time);
	if (ret != UPDATE_CONTINUE)
		return ret;

	const _bool can_use_scene_shortcut = !_Assist.IsKeyboardCaptured();

	if (can_use_scene_shortcut && _InputMgr.Down(VK_ESCAPE))
	{
		preview_player_.StopAll();
		_SceneMgr.ChangeScene(SceneType::Intro);
		return UPDATE_BREAK;
	}

	if (can_use_scene_shortcut && _InputMgr.Down(VK_F5))
		_ReloadData();

	if (can_use_scene_shortcut && _InputMgr.Down(VK_F8))
		_PreviewAtMouse();

	if (can_use_scene_shortcut && _InputMgr.Down(VK_F9))
		_SaveCurrentSet();

	if (can_use_scene_shortcut && _InputMgr.Down(VK_SPACE))
		_PreviewAtCenter();

	preview_player_.Update(_delta_time);
	return UPDATE_CONTINUE;
}

void ParticleStationScene::Render(_double _delta_time)
{
	const Resolution resolution = _ScreenSystem.WindowResolution();
	if (resolution.width > 0 && resolution.height > 0)
	{
		_DrawFunc::FillRectangle(
			_Rect{ _Point{ 0, 0 }, _Size{ resolution.width, resolution.height } },
			_Color(255, 18, 21, 28));
	}

	__super::Render(_delta_time);

	_DrawFunc::SetGlobalOffset(_Point::Zero());
	_DrawFunc::DrawString(_Point(24, 20), L"ParticleStation", Palette::White, 24.f, false);
	_DrawFunc::DrawString(_Point(24, 56), _GetSetLabel(), Palette::LightBlue, 16.f, false);
	_DrawFunc::DrawString(_Point(24, 84), L"Debug windows: EventSet / Event. F5 Reload, F8 Preview Mouse, Space Preview Center, F9 Save, Esc Intro.", Palette::White, 13.f, false);
	_DrawFunc::DrawString(_Point(24, 112), status_text_, status_color_, 14.f, false);
	_DrawPreviewDirectionGuide(resolution);
}

void ParticleStationScene::OnEnter()
{
	previous_debug_mode_ = _GameState.debug_mode_;
	_GameState.debug_mode_ = true;
	_RegisterDebugWindows();

	_SYSTEM_LOG_INFO(L"Entered ParticleStationScene.");
}

void ParticleStationScene::OnExit()
{
	preview_player_.StopAll();
	_RemoveDebugWindows();
	_GameState.debug_mode_ = previous_debug_mode_;
}

void ParticleStationScene::_LoadInitialSet()
{
	const auto set_ids = _GetSortedSetIds();
	if (!set_ids.empty())
	{
		selected_event_index_ = 0;
		_LoadSetById(set_ids.front());
		return;
	}

	working_set_.id_ = kDefaultEventSetId;
	working_set_.name_ = L"Default Particle Event Set";
	working_set_.events_.push_back(_CreateDefaultEvent());
	selected_set_id_ = working_set_.id_;
	selected_event_index_ = 0;
	has_working_set_ = true;
	_ResetPreviewEventEnabledFlags(true);
	_ParticleEventSetDataMgr.SetData(working_set_);
	_SetStatus(L"No ParticleEventSet data found. Created an in-memory default set.", Palette::Yellow);
}

_bool ParticleStationScene::_LoadSetById(_uint _set_id)
{
	const auto* event_set = _ParticleEventSetDataMgr.GetData(_set_id);
	if (event_set == nullptr)
		return false;

	preview_player_.StopAll();
	working_set_ = *event_set;
	selected_set_id_ = working_set_.id_;
	selected_event_index_ = working_set_.events_.empty()
		? 0
		: std::min(selected_event_index_, working_set_.events_.size() - 1);
	has_working_set_ = true;
	_ResetPreviewEventEnabledFlags(true);
	_SetStatus(L"Loaded " + _GetSetLabel() + L".", Palette::Green);
	return true;
}

void ParticleStationScene::_ReloadData()
{
	preview_player_.StopAll();
	if (!GameDataLoader::ReloadAll())
	{
		_SetStatus(L"Reload failed. Check JSON syntax and logs.", Palette::Red);
		return;
	}

	_RefreshTextureOptions();

	if (selected_set_id_ != 0 && _LoadSetById(selected_set_id_))
	{
		_SetStatus(L"Reload complete. Current ParticleEventSet was refreshed.", Palette::Green);
		return;
	}

	_LoadInitialSet();
	_SetStatus(L"Reload complete. Loaded the first available ParticleEventSet.", Palette::Green);
}

void ParticleStationScene::_SaveCurrentSet()
{
	if (!has_working_set_)
	{
		_SetStatus(L"Save skipped. No ParticleEventSet is loaded.", Palette::Red);
		return;
	}

	_ParticleEventSetDataMgr.SetData(working_set_);
	if (_ParticleEventSetDataMgr.Save(kParticleEventSetPath))
	{
		_SetStatus(L"Saved ParticleEventSet data to Data/ParticleEventSet.json.", Palette::Green);
	}
	else
	{
		_SetStatus(L"Save failed. Check file permissions or logs.", Palette::Red);
	}
}

void ParticleStationScene::_CreateNewSet()
{
	preview_player_.StopAll();

	working_set_ = ParticleEventSet();
	working_set_.id_ = _GetNextSetId();
	working_set_.name_ = L"Particle Event Set " + std::to_wstring(working_set_.id_);
	working_set_.events_.push_back(_CreateDefaultEvent());
	selected_set_id_ = working_set_.id_;
	selected_event_index_ = 0;
	has_working_set_ = true;
	_ResetPreviewEventEnabledFlags(true);

	_ParticleEventSetDataMgr.SetData(working_set_);
	_SetStatus(L"Created " + _GetSetLabel() + L". Save writes it to ParticleEventSet.json.", Palette::Green);
}

void ParticleStationScene::_RegisterDebugWindows()
{
	if (debug_windows_registered_)
		_RemoveDebugWindows();

	_BuildEventSetWindow();
	_BuildEventEditorWindow();
	debug_windows_registered_ = true;
}

void ParticleStationScene::_RemoveDebugWindows()
{
	if (!debug_windows_registered_)
		return;

	_Assist.RemoveWindow(kEventSetWindowName);
	_Assist.RemoveWindow(kEventEditorWindowName);
	debug_windows_registered_ = false;
}

void ParticleStationScene::_BuildEventSetWindow()
{
	_Assist.Separator(kEventSetWindowName, L"00_header", DweSeparatorData{ L"ParticleEventSet", true });

	DweDynamicTextData status_data;
	status_data.text_provider_ = [this]()
	{
		DweTextData data(status_text_.empty() ? L"Ready." : status_text_);
		data.color_ = status_color_;
		data.font_size_ = 12.f;
		return data;
	};
	_Assist.DynamicText(kEventSetWindowName, L"01_status", std::move(status_data));

	DweDynamicTextData set_summary_data;
	set_summary_data.text_provider_ = [this]()
	{
		DweTextData data(_GetSetLabel());
		data.color_ = Palette::Black;
		data.font_size_ = 12.f;
		return data;
	};
	_Assist.DynamicText(kEventSetWindowName, L"02_summary", std::move(set_summary_data));

	DweDynamicTextData pool_stats_data;
	pool_stats_data.text_provider_ = []()
	{
		const auto& stats = _ParticleService.GetPoolStats();
		DweTextData data(
			L"Pool: active=" + std::to_wstring(stats.active_count_) +
			L"/" + std::to_wstring(stats.pool_size_) +
			L" peak=" + std::to_wstring(stats.peak_active_count_) +
			L" dropped=" + std::to_wstring(stats.dropped_this_frame_) +
			L"/" + std::to_wstring(stats.dropped_total_));
		data.color_ = stats.dropped_this_frame_ > 0 ? Palette::Yellow : Palette::Black;
		data.font_size_ = 12.f;
		return data;
	};
	_Assist.DynamicText(kEventSetWindowName, L"025_pool_stats", std::move(pool_stats_data));

	DweDynamicTextData direction_preview_data;
	direction_preview_data.text_provider_ = [this]()
	{
		DweTextData data(_GetDirectionPreviewLabel());
		data.color_ = Palette::Black;
		data.font_size_ = 12.f;
		return data;
	};
	_Assist.DynamicText(kEventSetWindowName, L"026_direction_preview", std::move(direction_preview_data));

	DweInputTextData set_name_data;
	set_name_data.label_ = L"Set Name";
	set_name_data.max_length_ = 80;
	set_name_data.value_getter_ = [this]()
	{
		return has_working_set_ ? working_set_.name_ : std::wstring();
	};
	set_name_data.value_setter_ = [this](const std::wstring& _value)
	{
		if (!has_working_set_)
			return;

		working_set_.name_ = _value.empty() ? L"Particle Event Set" : _value;
	};
	_Assist.InputText(kEventSetWindowName, L"03_set_name", std::move(set_name_data));

	DweComboBoxData set_combo_data;
	set_combo_data.label_ = L"Load Set";
	set_combo_data.max_visible_options_ = 64;
	set_combo_data.option_provider_ = [this]() { return _GetSetOptionLabels(); };
	set_combo_data.selected_index_getter_ = [this]() { return _GetSelectedSetIndex(); };
	set_combo_data.selected_index_setter_ = [this](_int _index) { _SetSelectedSetIndex(_index); };
	_Assist.ComboBox(kEventSetWindowName, L"04_set_combo", std::move(set_combo_data));

	DweButtonRowData set_button_data;
	set_button_data.buttons_.push_back({ L"New", [this]() { _CreateNewSet(); } });
	set_button_data.buttons_.push_back({ L"Reload", [this]() { _ReloadData(); } });
	set_button_data.buttons_.push_back({ L"Save", [this]() { _SaveCurrentSet(); } });
	_Assist.ButtonRow(kEventSetWindowName, L"05_set_buttons", std::move(set_button_data));

	DweSliderFloatData preview_direction_data;
	preview_direction_data.label_ = L"Preview Dir";
	preview_direction_data.min_value_ = -180.f;
	preview_direction_data.max_value_ = 180.f;
	preview_direction_data.step_ = 1.f;
	preview_direction_data.precision_ = 0;
	preview_direction_data.value_getter_ = [this]() { return preview_direction_deg_; };
	preview_direction_data.value_setter_ = [this](_float _value)
	{
		preview_direction_deg_ = std::clamp(_value, -180.f, 180.f);
	};
	_Assist.SliderFloat(kEventSetWindowName, L"055_preview_direction", std::move(preview_direction_data));

	DweButtonRowData preview_button_data;
	preview_button_data.buttons_.push_back({ L"Preview Mouse", [this]() { _PreviewAtMouse(); } });
	preview_button_data.buttons_.push_back({ L"Preview Center", [this]() { _PreviewAtCenter(); } });
	preview_button_data.buttons_.push_back({ L"Stress Pool", [this]() { _RunPoolStressPreview(); } });
	_Assist.ButtonRow(kEventSetWindowName, L"06_preview_buttons", std::move(preview_button_data));

	_Assist.Separator(kEventSetWindowName, L"07_events_header", DweSeparatorData{ L"Events", true });

	DweSelectableListData event_list_data;
	event_list_data.label_ = L"Event List";
	event_list_data.max_visible_items_ = 100;
	event_list_data.item_provider_ = [this]() { return _GetEventListLabels(); };
	event_list_data.selected_index_getter_ = [this]() { return _GetSelectedEventIndex(); };
	event_list_data.selected_index_setter_ = [this](_int _index) { _SetSelectedEventIndex(_index); };
	_Assist.SelectableList(kEventSetWindowName, L"08_event_list", std::move(event_list_data));

	DweButtonRowData event_button_data;
	event_button_data.buttons_.push_back({ L"Add Event", [this]() { _AddEvent(); } });
	event_button_data.buttons_.push_back({ L"Remove Event", [this]() { _RemoveSelectedEvent(); } });
	_Assist.ButtonRow(kEventSetWindowName, L"09_event_buttons", std::move(event_button_data));
}

void ParticleStationScene::_BuildEventEditorWindow()
{
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
		_Assist.SliderFloat(kEventEditorWindowName, _key, std::move(data));
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
		_Assist.SliderInt(kEventEditorWindowName, _key, std::move(data));
	};

	auto add_combo = [this](
		const std::wstring& _key,
		const std::wstring& _label,
		_int _max_visible_options,
		std::function<std::vector<std::wstring>()> _options,
		std::function<_int()> _getter,
		std::function<void(_int)> _setter)
	{
		DweComboBoxData data;
		data.label_ = _label;
		data.max_visible_options_ = _max_visible_options;
		data.option_provider_ = std::move(_options);
		data.selected_index_getter_ = std::move(_getter);
		data.selected_index_setter_ = std::move(_setter);
		_Assist.ComboBox(kEventEditorWindowName, _key, std::move(data));
	};

	_Assist.Separator(kEventEditorWindowName, L"00_header", DweSeparatorData{ L"Selected Event", true });

	DweDynamicTextData event_summary_data;
	event_summary_data.text_provider_ = [this]()
	{
		DweTextData data(_GetEventSummary());
		data.color_ = Palette::Black;
		data.font_size_ = 12.f;
		return data;
	};
	_Assist.DynamicText(kEventEditorWindowName, L"01_summary", std::move(event_summary_data));

	DweDynamicTextData preview_state_data;
	preview_state_data.text_provider_ = [this]()
	{
		DweTextData data(_IsSelectedEventPreviewEnabled() ? L"Preview: Enabled" : L"Preview: Disabled");
		data.color_ = _IsSelectedEventPreviewEnabled() ? Palette::Green : Palette::Red;
		data.font_size_ = 12.f;
		return data;
	};
	_Assist.DynamicText(kEventEditorWindowName, L"015_preview_state", std::move(preview_state_data));

	DweButtonRowData preview_option_data;
	preview_option_data.buttons_.push_back({ L"Enable", [this]() { _SetSelectedEventPreviewEnabled(true); } });
	preview_option_data.buttons_.push_back({ L"Disable", [this]() { _SetSelectedEventPreviewEnabled(false); } });
	preview_option_data.buttons_.push_back({ L"Toggle", [this]() { _ToggleSelectedEventPreviewEnabled(); } });
	_Assist.ButtonRow(kEventEditorWindowName, L"016_preview_toggle", std::move(preview_option_data));

	DweDynamicTextData direction_preview_data;
	direction_preview_data.text_provider_ = [this]()
	{
		DweTextData data(_GetDirectionPreviewLabel());
		data.color_ = Palette::Black;
		data.font_size_ = 12.f;
		return data;
	};
	_Assist.DynamicText(kEventEditorWindowName, L"017_direction_preview", std::move(direction_preview_data));

	DweInputTextData event_name_data;
	event_name_data.label_ = L"Event Name";
	event_name_data.max_length_ = 80;
	event_name_data.value_getter_ = [this]()
	{
		const auto* event_spec = _GetSelectedEvent();
		return event_spec != nullptr ? event_spec->name_ : std::wstring();
	};
	event_name_data.value_setter_ = [this](const std::wstring& _value)
	{
		auto* event_spec = _GetSelectedEvent();
		if (event_spec == nullptr)
			return;

		event_spec->name_ = _value.empty() ? L"Particle Event" : _value;
	};
	_Assist.InputText(kEventEditorWindowName, L"02_event_name", std::move(event_name_data));

	add_combo(
		L"03_playback_type",
		L"Playback",
		4,
		[this]() { return _GetPlaybackTypeLabels(); },
		[this]() { return _GetSelectedPlaybackTypeIndex(); },
		[this](_int _index) { _SetSelectedPlaybackTypeIndex(_index); });

	add_combo(
		L"04_particle_source",
		L"Particle Source",
		64,
		[this]() { return _GetParticleSourceLabels(); },
		[this]() { return _GetSelectedParticleSourceIndex(); },
		[this](_int _index) { _SetSelectedParticleSourceIndex(_index); });

	add_combo(
		L"05_texture",
		L"Texture",
		64,
		[this]() { return _GetTextureLabels(); },
		[this]() { return _GetSelectedTextureIndex(); },
		[this](_int _index) { _SetSelectedTextureIndex(_index); });

	_Assist.Separator(kEventEditorWindowName, L"06_direction_header", DweSeparatorData{ L"Direction", true });

	add_combo(
		L"07_direction_mode",
		L"Mode",
		4,
		[this]() { return _GetDirectionModeLabels(); },
		[this]() { return _GetSelectedDirectionModeIndex(); },
		[this](_int _index) { _SetSelectedDirectionModeIndex(_index); });

	add_float(
		L"08_base_direction",
		L"Base Dir",
		-180.f,
		180.f,
		1.f,
		0,
		[this]() { const auto* e = _GetSelectedEvent(); return e ? e->base_direction_deg_ : 0.f; },
		[this](_float _value) { if (auto* e = _GetSelectedEvent()) e->base_direction_deg_ = std::clamp(_value, -180.f, 180.f); });

	add_float(
		L"09_direction_influence",
		L"Dir Influence",
		0.f,
		1.f,
		0.01f,
		2,
		[this]() { const auto* e = _GetSelectedEvent(); return e ? e->direction_influence_ : 0.f; },
		[this](_float _value) { if (auto* e = _GetSelectedEvent()) e->direction_influence_ = std::clamp(_value, 0.f, 1.f); });

	_Assist.Separator(kEventEditorWindowName, L"10_timing_header", DweSeparatorData{ L"Timing", true });

	add_float(
		L"11_delay",
		L"Delay",
		0.f,
		5.f,
		0.01f,
		2,
		[this]() { const auto* e = _GetSelectedEvent(); return e ? e->delay_sec_ : 0.f; },
		[this](_float _value) { if (auto* e = _GetSelectedEvent()) e->delay_sec_ = std::max(0.f, _value); });

	DweVector2FieldData offset_data;
	offset_data.label_ = L"Offset";
	offset_data.min_value_ = -600.f;
	offset_data.max_value_ = 600.f;
	offset_data.step_ = 1.f;
	offset_data.precision_ = 0;
	offset_data.value_getter_ = [this]()
	{
		const auto* event_spec = _GetSelectedEvent();
		return event_spec != nullptr ? event_spec->local_offset_ : _Vector2::Zero();
	};
	offset_data.value_setter_ = [this](const _Vector2& _value)
	{
		if (auto* event_spec = _GetSelectedEvent())
			event_spec->local_offset_ = _value;
	};
	_Assist.Vector2Field(kEventEditorWindowName, L"12_offset", std::move(offset_data));

	add_int(
		L"13_burst_count",
		L"Burst Count",
		1,
		200,
		1,
		[this]() { const auto* e = _GetSelectedEvent(); return e ? s_int(e->burst_count_) : 1; },
		[this](_int _value) { if (auto* e = _GetSelectedEvent()) e->burst_count_ = s_uint(std::max(1, _value)); });

	_Assist.Separator(kEventEditorWindowName, L"20_shape_header", DweSeparatorData{ L"Shape", true });

	add_combo(
		L"21_shape",
		L"Shape",
		4,
		[this]() { return _GetShapeLabels(); },
		[this]() { return _GetSelectedShapeIndex(); },
		[this](_int _index) { _SetSelectedShapeIndex(_index); });

	add_float(
		L"22_shape_radius",
		L"Radius/Box",
		0.f,
		300.f,
		1.f,
		1,
		[this]() { const auto* e = _GetSelectedEvent(); return e ? e->particle_setting_.shapeRadius : 0.f; },
		[this](_float _value) { if (auto* e = _GetSelectedEvent()) e->particle_setting_.shapeRadius = std::max(0.f, _value); });

	add_float(
		L"23_arc_angle",
		L"Arc Angle",
		0.f,
		360.f,
		1.f,
		0,
		[this]() { const auto* e = _GetSelectedEvent(); return e ? e->particle_setting_.arcAngle : 360.f; },
		[this](_float _value) { if (auto* e = _GetSelectedEvent()) e->particle_setting_.arcAngle = std::clamp(_value, 0.f, 360.f); });

	_Assist.Separator(kEventEditorWindowName, L"30_lifetime_header", DweSeparatorData{ L"Lifetime / Speed", true });

	add_float(
		L"31_min_life",
		L"Min Life",
		0.01f,
		10.f,
		0.01f,
		2,
		[this]() { const auto* e = _GetSelectedEvent(); return e ? e->particle_setting_.minLife : 0.01f; },
		[this](_float _value)
	{
		if (auto* e = _GetSelectedEvent())
		{
			e->particle_setting_.minLife = std::max(0.01f, _value);
			e->particle_setting_.maxLife = std::max(e->particle_setting_.maxLife, e->particle_setting_.minLife);
		}
	});

	add_float(
		L"32_max_life",
		L"Max Life",
		0.01f,
		10.f,
		0.01f,
		2,
		[this]() { const auto* e = _GetSelectedEvent(); return e ? e->particle_setting_.maxLife : 0.01f; },
		[this](_float _value)
	{
		if (auto* e = _GetSelectedEvent())
			e->particle_setting_.maxLife = std::max(e->particle_setting_.minLife, _value);
	});

	add_float(
		L"33_min_speed",
		L"Min Speed",
		0.f,
		1000.f,
		1.f,
		0,
		[this]() { const auto* e = _GetSelectedEvent(); return e ? e->particle_setting_.minSpeed : 0.f; },
		[this](_float _value)
	{
		if (auto* e = _GetSelectedEvent())
		{
			e->particle_setting_.minSpeed = std::max(0.f, _value);
			e->particle_setting_.maxSpeed = std::max(e->particle_setting_.maxSpeed, e->particle_setting_.minSpeed);
		}
	});

	add_float(
		L"34_max_speed",
		L"Max Speed",
		0.f,
		1000.f,
		1.f,
		0,
		[this]() { const auto* e = _GetSelectedEvent(); return e ? e->particle_setting_.maxSpeed : 0.f; },
		[this](_float _value)
	{
		if (auto* e = _GetSelectedEvent())
			e->particle_setting_.maxSpeed = std::max(e->particle_setting_.minSpeed, _value);
	});

	_Assist.Separator(kEventEditorWindowName, L"40_scale_header", DweSeparatorData{ L"Scale / Ease", true });

	add_float(
		L"41_start_scale",
		L"Start Scale",
		0.f,
		10.f,
		0.01f,
		2,
		[this]() { const auto* e = _GetSelectedEvent(); return e ? e->particle_setting_.startScale : 0.f; },
		[this](_float _value) { if (auto* e = _GetSelectedEvent()) e->particle_setting_.startScale = std::max(0.f, _value); });

	add_float(
		L"42_end_scale",
		L"End Scale",
		0.f,
		10.f,
		0.01f,
		2,
		[this]() { const auto* e = _GetSelectedEvent(); return e ? e->particle_setting_.endScale : 0.f; },
		[this](_float _value) { if (auto* e = _GetSelectedEvent()) e->particle_setting_.endScale = std::max(0.f, _value); });

	add_combo(
		L"43_size_ease",
		L"Size Ease",
		12,
		[this]() { return _GetEaseLabels(); },
		[this]() { return _GetSelectedSizeEaseIndex(); },
		[this](_int _index) { _SetSelectedSizeEaseIndex(_index); });

	_Assist.Separator(kEventEditorWindowName, L"50_color_header", DweSeparatorData{ L"Color / Ease", true });

	DweColorEditData start_color_data;
	start_color_data.label_ = L"Start Color";
	start_color_data.value_getter_ = [this]()
	{
		const auto* event_spec = _GetSelectedEvent();
		return event_spec != nullptr ? event_spec->particle_setting_.startColor : _Color(255, 255, 255, 255);
	};
	start_color_data.value_setter_ = [this](const _Color& _value)
	{
		if (auto* event_spec = _GetSelectedEvent())
			event_spec->particle_setting_.startColor = _value;
	};
	_Assist.ColorEdit(kEventEditorWindowName, L"51_start_color", std::move(start_color_data));

	DweColorEditData end_color_data;
	end_color_data.label_ = L"End Color";
	end_color_data.value_getter_ = [this]()
	{
		const auto* event_spec = _GetSelectedEvent();
		return event_spec != nullptr ? event_spec->particle_setting_.endColor : _Color(0, 255, 255, 255);
	};
	end_color_data.value_setter_ = [this](const _Color& _value)
	{
		if (auto* event_spec = _GetSelectedEvent())
			event_spec->particle_setting_.endColor = _value;
	};
	_Assist.ColorEdit(kEventEditorWindowName, L"52_end_color", std::move(end_color_data));

	add_combo(
		L"53_color_ease",
		L"Color Ease",
		12,
		[this]() { return _GetEaseLabels(); },
		[this]() { return _GetSelectedColorEaseIndex(); },
		[this](_int _index) { _SetSelectedColorEaseIndex(_index); });

	_Assist.Separator(kEventEditorWindowName, L"60_physics_header", DweSeparatorData{ L"Physics", true });

	add_float(
		L"61_air_resistance",
		L"Air Resist",
		0.f,
		20.f,
		0.01f,
		2,
		[this]() { const auto* e = _GetSelectedEvent(); return e ? e->particle_setting_.airResistance : 0.f; },
		[this](_float _value) { if (auto* e = _GetSelectedEvent()) e->particle_setting_.airResistance = std::max(0.f, _value); });

	add_float(
		L"62_gravity_scale",
		L"Gravity",
		-10.f,
		10.f,
		0.01f,
		2,
		[this]() { const auto* e = _GetSelectedEvent(); return e ? e->particle_setting_.gravityScale : 0.f; },
		[this](_float _value) { if (auto* e = _GetSelectedEvent()) e->particle_setting_.gravityScale = _value; });

	_Assist.Separator(kEventEditorWindowName, L"70_emitter_header", DweSeparatorData{ L"Emitter Playback", true });

	add_float(
		L"71_emitter_interval",
		L"Interval",
		0.01f,
		2.f,
		0.01f,
		2,
		[this]() { const auto* e = _GetSelectedEvent(); return e ? e->emitter_spec_.emit_interval_sec_ : 0.01f; },
		[this](_float _value) { if (auto* e = _GetSelectedEvent()) e->emitter_spec_.emit_interval_sec_ = std::max(0.01f, _value); });

	add_int(
		L"72_emitter_count",
		L"Count/Tick",
		1,
		200,
		1,
		[this]() { const auto* e = _GetSelectedEvent(); return e ? s_int(e->emitter_spec_.emit_count_per_tick_) : 1; },
		[this](_int _value) { if (auto* e = _GetSelectedEvent()) e->emitter_spec_.emit_count_per_tick_ = s_uint(std::max(1, _value)); });

	add_float(
		L"73_emitter_duration",
		L"Duration",
		0.f,
		10.f,
		0.01f,
		2,
		[this]() { const auto* e = _GetSelectedEvent(); return e ? e->emitter_spec_.duration_sec_ : 0.f; },
		[this](_float _value) { if (auto* e = _GetSelectedEvent()) e->emitter_spec_.duration_sec_ = std::max(0.f, _value); });
}

void ParticleStationScene::_RefreshTextureOptions()
{
	texture_options_.clear();
	texture_options_.push_back(kEmptyTextureLabel);

	auto add_texture = [this](const std::wstring& _texture_key)
	{
		if (_texture_key.empty())
			return;

		if (std::find(texture_options_.begin(), texture_options_.end(), _texture_key) == texture_options_.end())
			texture_options_.push_back(_texture_key);
	};

	const std::filesystem::path root(kParticleTextureRoot);
	if (std::filesystem::exists(root))
	{
		for (const auto& entry : std::filesystem::recursive_directory_iterator(root))
		{
			if (!entry.is_regular_file() || !IsTextureExtension(entry.path()))
				continue;

			add_texture(entry.path().generic_wstring());
		}
	}

	for (const auto& [id, setting] : _ParticleDataMgr.GetTable())
	{
		(void)id;
		add_texture(setting.textureKey);
	}

	if (has_working_set_)
	{
		for (const auto& event_spec : working_set_.events_)
			add_texture(event_spec.particle_setting_.textureKey);
	}

	if (texture_options_.size() > 1)
		std::sort(texture_options_.begin() + 1, texture_options_.end());
}

void ParticleStationScene::_AddEvent()
{
	if (!has_working_set_)
		_CreateNewSet();

	const auto* selected_event = _GetSelectedEvent();
	ParticleEventSpec event_spec = selected_event != nullptr
		? *selected_event
		: _CreateDefaultEvent();

	event_spec.id_ = _GetNextEventId();
	event_spec.name_ = L"Event " + std::to_wstring(event_spec.id_);
	if (event_spec.emitter_spec_.id_ == 0 ||
		(selected_event != nullptr && event_spec.emitter_spec_.id_ == selected_event->emitter_spec_.id_))
	{
		event_spec.emitter_spec_.id_ = event_spec.id_;
	}

	working_set_.events_.push_back(event_spec);
	preview_event_enabled_.push_back(1);
	selected_event_index_ = working_set_.events_.size() - 1;
	_SetStatus(L"Added " + event_spec.name_ + L".", Palette::Green);
}

void ParticleStationScene::_RemoveSelectedEvent()
{
	if (working_set_.events_.empty())
	{
		_SetStatus(L"Remove skipped. The event set is already empty.", Palette::Yellow);
		return;
	}

	const auto removed_name = working_set_.events_[selected_event_index_].name_;
	working_set_.events_.erase(working_set_.events_.begin() + selected_event_index_);
	if (selected_event_index_ < preview_event_enabled_.size())
		preview_event_enabled_.erase(preview_event_enabled_.begin() + selected_event_index_);

	if (selected_event_index_ >= working_set_.events_.size() && !working_set_.events_.empty())
		selected_event_index_ = working_set_.events_.size() - 1;

	_SetStatus(L"Removed " + removed_name + L".", Palette::Green);
}

void ParticleStationScene::_PreviewAtMouse()
{
	const auto mouse_pos = _InputMgr.MousePointDesign();
	_PreviewAt(_Vector2(s_float(mouse_pos.x), s_float(mouse_pos.y)), L"mouse cursor");
}

void ParticleStationScene::_PreviewAtCenter()
{
	const Resolution resolution = _ScreenSystem.WindowResolution();
	_PreviewAt(
		_Vector2(s_float(resolution.width) * 0.5f, s_float(resolution.height) * 0.5f),
		L"screen center");
}

void ParticleStationScene::_PreviewAt(const _Vector2& _world_pos, const std::wstring& _location_label)
{
	if (!has_working_set_)
	{
		_SetStatus(L"Preview skipped. No ParticleEventSet is loaded.", Palette::Red);
		return;
	}

	if (working_set_.events_.empty())
	{
		_SetStatus(L"Preview skipped. The current ParticleEventSet has no events.", Palette::Yellow);
		return;
	}

	_SyncPreviewEventEnabledFlags(true);
	if (_GetPreviewEnabledEventCount() <= 0)
	{
		_SetStatus(L"Preview skipped. All events are disabled for station preview.", Palette::Yellow);
		return;
	}

	ParticleEventSet preview_set = working_set_;
	preview_set.events_.clear();
	preview_set.events_.reserve(working_set_.events_.size());
	for (size_t i = 0; i < working_set_.events_.size(); ++i)
	{
		if (_IsEventPreviewEnabled(i))
			preview_set.events_.push_back(working_set_.events_[i]);
	}

	preview_player_.StopAll();
	_ParticleService.ClearSceneState();
	ParticleEventSetPlayContext play_context;
	play_context.world_origin_ = _world_pos;
	play_context.direction_deg_ = preview_direction_deg_;
	play_context.has_direction_ = true;
	preview_player_.Play(preview_set, play_context);
	_SetStatus(
		L"Previewing " + std::to_wstring(preview_set.events_.size()) +
		L"/" + std::to_wstring(working_set_.events_.size()) +
		L" enabled events at " + _location_label +
		L" dir=" + FormatFloat(preview_direction_deg_, 0) + L"deg.",
		Palette::Green);
}

void ParticleStationScene::_RunPoolStressPreview()
{
	const auto* event_spec = _GetSelectedEvent();
	if (event_spec == nullptr)
	{
		_SetStatus(L"Pool stress skipped. Select or add an event first.", Palette::Yellow);
		return;
	}

	const auto pool_size = std::max(1u, _ParticleService.GetPoolStats().pool_size_);
	const auto stress_count = pool_size + 128u;
	const Resolution resolution = _ScreenSystem.WindowResolution();
	const _Vector2 world_pos(s_float(resolution.width) * 0.5f, s_float(resolution.height) * 0.5f);

	auto setting = event_spec->particle_setting_;
	setting.shape = EmitterShape::Point;
	setting.arcAngle = 360.f;
	setting.minLife = std::max(0.75f, setting.minLife);
	setting.maxLife = std::max(setting.minLife, setting.maxLife);

	preview_player_.StopAll();
	_ParticleService.ClearSceneState();
	_ParticleService.Emit(setting, world_pos, stress_count, _MathFunc::ToRadian(preview_direction_deg_));

	const auto& stats = _ParticleService.GetPoolStats();
	last_pool_stress_dropped_count_ = stats.dropped_this_frame_;
	_SetStatus(
		L"Pool stress emitted " + std::to_wstring(stress_count) +
		L" particles. dropped=" + std::to_wstring(last_pool_stress_dropped_count_) +
		L" total=" + std::to_wstring(stats.dropped_total_) + L".",
		last_pool_stress_dropped_count_ > 0 ? Palette::Green : Palette::Yellow);
}

void ParticleStationScene::_ResetPreviewEventEnabledFlags(_bool _is_enabled)
{
	preview_event_enabled_.assign(working_set_.events_.size(), _is_enabled ? 1 : 0);
}

void ParticleStationScene::_SyncPreviewEventEnabledFlags(_bool _default_enabled)
{
	if (preview_event_enabled_.size() < working_set_.events_.size())
	{
		preview_event_enabled_.resize(working_set_.events_.size(), _default_enabled ? 1 : 0);
	}
	else if (preview_event_enabled_.size() > working_set_.events_.size())
	{
		preview_event_enabled_.resize(working_set_.events_.size());
	}
}

_bool ParticleStationScene::_IsEventPreviewEnabled(size_t _event_index) const
{
	if (_event_index >= working_set_.events_.size())
		return false;

	if (_event_index >= preview_event_enabled_.size())
		return true;

	return preview_event_enabled_[_event_index] != 0;
}

_bool ParticleStationScene::_IsSelectedEventPreviewEnabled() const
{
	return _IsEventPreviewEnabled(selected_event_index_);
}

void ParticleStationScene::_SetSelectedEventPreviewEnabled(_bool _is_enabled)
{
	if (_GetSelectedEvent() == nullptr)
		return;

	_SyncPreviewEventEnabledFlags(true);
	preview_event_enabled_[selected_event_index_] = _is_enabled ? 1 : 0;
	_SetStatus(std::wstring(L"Selected event preview ") + (_is_enabled ? L"enabled." : L"disabled."), _is_enabled ? Palette::Green : Palette::Yellow);
}

void ParticleStationScene::_ToggleSelectedEventPreviewEnabled()
{
	_SetSelectedEventPreviewEnabled(!_IsSelectedEventPreviewEnabled());
}

_int ParticleStationScene::_GetPreviewEnabledEventCount() const
{
	_int count = 0;
	for (size_t i = 0; i < working_set_.events_.size(); ++i)
	{
		if (_IsEventPreviewEnabled(i))
			++count;
	}

	return count;
}

ParticleEventSpec* ParticleStationScene::_GetSelectedEvent()
{
	if (working_set_.events_.empty() || selected_event_index_ >= working_set_.events_.size())
		return nullptr;

	return &working_set_.events_[selected_event_index_];
}

const ParticleEventSpec* ParticleStationScene::_GetSelectedEvent() const
{
	if (working_set_.events_.empty() || selected_event_index_ >= working_set_.events_.size())
		return nullptr;

	return &working_set_.events_[selected_event_index_];
}

ParticleEventSpec ParticleStationScene::_CreateDefaultEvent() const
{
	ParticleEventSpec event_spec;
	event_spec.id_ = 1;
	event_spec.name_ = L"Event 1";
	event_spec.burst_count_ = kDefaultBurstCount;
	event_spec.emitter_spec_.id_ = event_spec.id_;
	event_spec.emitter_spec_.emit_interval_sec_ = 0.03f;
	event_spec.emitter_spec_.emit_count_per_tick_ = kDefaultBurstCount;
	event_spec.emitter_spec_.duration_sec_ = 0.4f;

	const auto particle_ids = _GetSortedParticleIds();
	if (!particle_ids.empty())
	{
		const auto* setting = _ParticleDataMgr.GetData(particle_ids.front());
		if (setting != nullptr)
			_ApplyParticleSettingToEvent(event_spec, *setting);
	}

	return event_spec;
}

_uint ParticleStationScene::_GetNextSetId() const
{
	_uint next_id = kDefaultEventSetId;
	for (const auto& [id, event_set] : _ParticleEventSetDataMgr.GetTable())
	{
		(void)event_set;
		next_id = std::max(next_id, id + 1);
	}

	if (has_working_set_)
		next_id = std::max(next_id, working_set_.id_ + 1);

	return next_id;
}

_uint ParticleStationScene::_GetNextEventId() const
{
	_uint next_id = 1;
	for (const auto& event_spec : working_set_.events_)
		next_id = std::max(next_id, event_spec.id_ + 1);

	return next_id;
}

std::vector<_uint> ParticleStationScene::_GetSortedSetIds() const
{
	std::vector<_uint> ids;
	ids.reserve(_ParticleEventSetDataMgr.GetTable().size());
	for (const auto& [id, event_set] : _ParticleEventSetDataMgr.GetTable())
	{
		(void)event_set;
		ids.push_back(id);
	}

	std::sort(ids.begin(), ids.end());
	return ids;
}

std::vector<_uint> ParticleStationScene::_GetSortedParticleIds() const
{
	std::vector<_uint> ids;
	ids.reserve(_ParticleDataMgr.GetTable().size());
	for (const auto& [id, setting] : _ParticleDataMgr.GetTable())
	{
		(void)setting;
		ids.push_back(id);
	}

	std::sort(ids.begin(), ids.end());
	return ids;
}

void ParticleStationScene::_ApplyParticleSettingToEvent(ParticleEventSpec& _event, const ParticleSetting& _setting) const
{
	_event.particle_setting_ = _setting;
	_event.emitter_spec_.particle_setting_id_ = _setting.id_;
	if (_event.emitter_spec_.id_ == 0)
		_event.emitter_spec_.id_ = _event.id_;
	if (_event.emitter_spec_.emit_interval_sec_ <= 0.f)
		_event.emitter_spec_.emit_interval_sec_ = 0.03f;
	if (_event.emitter_spec_.emit_count_per_tick_ == 0)
		_event.emitter_spec_.emit_count_per_tick_ = std::max(1u, _event.burst_count_);
	if (_event.emitter_spec_.duration_sec_ < 0.f)
		_event.emitter_spec_.duration_sec_ = 0.f;
}

std::vector<std::wstring> ParticleStationScene::_GetSetOptionLabels() const
{
	const auto set_ids = _GetSortedSetIds();
	if (set_ids.empty())
		return { L"<none>" };

	std::vector<std::wstring> labels;
	labels.reserve(set_ids.size());
	for (const auto set_id : set_ids)
	{
		const auto* event_set = _ParticleEventSetDataMgr.GetData(set_id);
		if (event_set == nullptr)
		{
			labels.push_back(L"#" + std::to_wstring(set_id));
			continue;
		}

		labels.push_back(L"#" + std::to_wstring(event_set->id_) + L" " + event_set->name_);
	}

	return labels;
}

std::vector<std::wstring> ParticleStationScene::_GetEventListLabels() const
{
	if (working_set_.events_.empty())
		return { L"<empty>" };

	std::vector<std::wstring> labels;
	labels.reserve(working_set_.events_.size());
	for (size_t i = 0; i < working_set_.events_.size(); ++i)
	{
		const auto state_label = _IsEventPreviewEnabled(i) ? L"[ON] " : L"[OFF] ";
		labels.push_back(state_label + _GetEventLabel(working_set_.events_[i]));
	}

	return labels;
}

std::vector<std::wstring> ParticleStationScene::_GetParticleSourceLabels() const
{
	const auto particle_ids = _GetSortedParticleIds();
	if (particle_ids.empty())
		return { L"<none>" };

	std::vector<std::wstring> labels;
	labels.reserve(particle_ids.size());
	for (const auto particle_id : particle_ids)
	{
		const auto* setting = _ParticleDataMgr.GetData(particle_id);
		if (setting == nullptr)
		{
			labels.push_back(L"#" + std::to_wstring(particle_id));
			continue;
		}

		labels.push_back(L"#" + std::to_wstring(setting->id_) + L" " + GetTextureDisplayLabel(setting->textureKey));
	}

	return labels;
}

std::vector<std::wstring> ParticleStationScene::_GetPlaybackTypeLabels() const
{
	return { L"Burst", L"Emitter" };
}

std::vector<std::wstring> ParticleStationScene::_GetDirectionModeLabels() const
{
	return { L"World", L"PlayContext" };
}

std::vector<std::wstring> ParticleStationScene::_GetShapeLabels() const
{
	return { L"Point", L"Circle", L"Box" };
}

std::vector<std::wstring> ParticleStationScene::_GetEaseLabels() const
{
	return {
		L"Linear",
		L"InQuad",
		L"OutQuad",
		L"InOutQuad",
		L"InCubic",
		L"OutCubic",
		L"InBack",
		L"OutBack",
		L"InElastic",
		L"OutElastic"
	};
}

std::vector<std::wstring> ParticleStationScene::_GetTextureLabels() const
{
	std::vector<std::wstring> labels;
	labels.reserve(texture_options_.size());
	for (const auto& texture_key : texture_options_)
		labels.push_back(GetTextureDisplayLabel(texture_key));

	return labels.empty() ? std::vector<std::wstring>{ kEmptyTextureLabel } : labels;
}

_int ParticleStationScene::_GetSelectedSetIndex() const
{
	const auto set_ids = _GetSortedSetIds();
	auto iter = std::find(set_ids.begin(), set_ids.end(), selected_set_id_);
	if (iter == set_ids.end())
		return 0;

	return s_int(std::distance(set_ids.begin(), iter));
}

void ParticleStationScene::_SetSelectedSetIndex(_int _index)
{
	const auto set_ids = _GetSortedSetIds();
	if (_index < 0 || _index >= s_int(set_ids.size()))
		return;

	selected_event_index_ = 0;
	_LoadSetById(set_ids[_index]);
}

_int ParticleStationScene::_GetSelectedEventIndex() const
{
	return working_set_.events_.empty() ? -1 : s_int(selected_event_index_);
}

void ParticleStationScene::_SetSelectedEventIndex(_int _index)
{
	if (_index < 0 || _index >= s_int(working_set_.events_.size()))
		return;

	selected_event_index_ = s_cast(size_t, _index);
}

_int ParticleStationScene::_GetSelectedParticleSourceIndex() const
{
	const auto* event_spec = _GetSelectedEvent();
	if (event_spec == nullptr)
		return 0;

	const auto particle_ids = _GetSortedParticleIds();
	auto iter = std::find(particle_ids.begin(), particle_ids.end(), event_spec->particle_setting_.id_);
	if (iter == particle_ids.end())
		return 0;

	return s_int(std::distance(particle_ids.begin(), iter));
}

void ParticleStationScene::_SetSelectedParticleSourceIndex(_int _index)
{
	auto* event_spec = _GetSelectedEvent();
	if (event_spec == nullptr)
		return;

	const auto particle_ids = _GetSortedParticleIds();
	if (_index < 0 || _index >= s_int(particle_ids.size()))
		return;

	const auto* setting = _ParticleDataMgr.GetData(particle_ids[_index]);
	if (setting == nullptr)
		return;

	_ApplyParticleSettingToEvent(*event_spec, *setting);
	_RefreshTextureOptions();
	_SetStatus(L"Applied Particle.json id=" + std::to_wstring(setting->id_) + L" to the selected event.", Palette::Green);
}

_int ParticleStationScene::_GetSelectedPlaybackTypeIndex() const
{
	const auto* event_spec = _GetSelectedEvent();
	return event_spec != nullptr ? std::clamp(s_int(event_spec->playback_type_), 0, 1) : 0;
}

void ParticleStationScene::_SetSelectedPlaybackTypeIndex(_int _index)
{
	auto* event_spec = _GetSelectedEvent();
	if (event_spec == nullptr)
		return;

	event_spec->playback_type_ = static_cast<ParticleEventPlaybackType>(std::clamp(_index, 0, 1));
	_SetStatus(L"Selected event type changed to " + GetPlaybackTypeLabel(event_spec->playback_type_) + L".", Palette::Green);
}

_int ParticleStationScene::_GetSelectedDirectionModeIndex() const
{
	const auto* event_spec = _GetSelectedEvent();
	return event_spec != nullptr ? std::clamp(s_int(event_spec->direction_mode_), 0, 1) : 0;
}

void ParticleStationScene::_SetSelectedDirectionModeIndex(_int _index)
{
	auto* event_spec = _GetSelectedEvent();
	if (event_spec == nullptr)
		return;

	event_spec->direction_mode_ = static_cast<ParticleEventDirectionMode>(std::clamp(_index, 0, 1));
	_SetStatus(L"Selected event direction changed to " + GetDirectionModeLabel(event_spec->direction_mode_) + L".", Palette::Green);
}

_int ParticleStationScene::_GetSelectedShapeIndex() const
{
	const auto* event_spec = _GetSelectedEvent();
	return event_spec != nullptr ? std::clamp(s_int(event_spec->particle_setting_.shape), 0, 2) : 0;
}

void ParticleStationScene::_SetSelectedShapeIndex(_int _index)
{
	auto* event_spec = _GetSelectedEvent();
	if (event_spec == nullptr)
		return;

	event_spec->particle_setting_.shape = static_cast<EmitterShape>(std::clamp(_index, 0, 2));
}

_int ParticleStationScene::_GetSelectedSizeEaseIndex() const
{
	const auto* event_spec = _GetSelectedEvent();
	return event_spec != nullptr ? std::clamp(s_int(event_spec->particle_setting_.sizeEase), 0, 9) : 0;
}

void ParticleStationScene::_SetSelectedSizeEaseIndex(_int _index)
{
	auto* event_spec = _GetSelectedEvent();
	if (event_spec == nullptr)
		return;

	event_spec->particle_setting_.sizeEase = static_cast<_MathFunc::EaseType>(std::clamp(_index, 0, 9));
}

_int ParticleStationScene::_GetSelectedColorEaseIndex() const
{
	const auto* event_spec = _GetSelectedEvent();
	return event_spec != nullptr ? std::clamp(s_int(event_spec->particle_setting_.colorEase), 0, 9) : 0;
}

void ParticleStationScene::_SetSelectedColorEaseIndex(_int _index)
{
	auto* event_spec = _GetSelectedEvent();
	if (event_spec == nullptr)
		return;

	event_spec->particle_setting_.colorEase = static_cast<_MathFunc::EaseType>(std::clamp(_index, 0, 9));
}

_int ParticleStationScene::_GetSelectedTextureIndex() const
{
	const auto* event_spec = _GetSelectedEvent();
	if (event_spec == nullptr || event_spec->particle_setting_.textureKey.empty())
		return 0;

	auto iter = std::find(texture_options_.begin(), texture_options_.end(), event_spec->particle_setting_.textureKey);
	if (iter == texture_options_.end())
		return 0;

	return s_int(std::distance(texture_options_.begin(), iter));
}

void ParticleStationScene::_SetSelectedTextureIndex(_int _index)
{
	auto* event_spec = _GetSelectedEvent();
	if (event_spec == nullptr)
		return;

	if (_index <= 0)
	{
		event_spec->particle_setting_.textureKey.clear();
		return;
	}

	if (_index >= s_int(texture_options_.size()))
		return;

	event_spec->particle_setting_.textureKey = texture_options_[_index];
}

void ParticleStationScene::_SetStatus(const std::wstring& _text, const _Color& _color)
{
	status_text_ = _text;
	status_color_ = _color;
}

std::wstring ParticleStationScene::_GetSetLabel() const
{
	if (!has_working_set_)
		return L"ParticleEventSet: <none>";

	return L"ParticleEventSet: " + std::to_wstring(working_set_.id_) + L" / " + working_set_.name_;
}

std::wstring ParticleStationScene::_GetEventLabel(const ParticleEventSpec& _event) const
{
	return L"#" + std::to_wstring(_event.id_) +
		L" " + _event.name_ +
		L" [" + GetPlaybackTypeLabel(_event.playback_type_) + L"]" +
		L" particle=" + std::to_wstring(_event.particle_setting_.id_) +
		L" delay=" + FormatFloat(_event.delay_sec_) +
		L" dir=" + GetDirectionModeLabel(_event.direction_mode_) +
		L" base=" + FormatFloat(_event.base_direction_deg_, 0) +
		L" inf=" + FormatFloat(_event.direction_influence_, 2) +
		L" texture=" + GetTextureDisplayLabel(_event.particle_setting_.textureKey);
}

std::wstring ParticleStationScene::_GetEventSummary() const
{
	const auto* event_spec = _GetSelectedEvent();
	if (event_spec == nullptr)
		return L"No event selected. Add an event from the EventSet window.";

	return L"Editing " + _GetEventLabel(*event_spec) +
		L" / preview=" + (_IsSelectedEventPreviewEnabled() ? L"ON" : L"OFF") +
		L" / shape=" + GetShapeLabel(event_spec->particle_setting_.shape) +
		L" / sizeEase=" + GetEaseLabel(event_spec->particle_setting_.sizeEase) +
		L" / colorEase=" + GetEaseLabel(event_spec->particle_setting_.colorEase);
}

std::wstring ParticleStationScene::_GetDirectionPreviewLabel() const
{
	const auto* event_spec = _GetSelectedEvent();
	if (event_spec == nullptr)
	{
		return L"Preview Dir: " + FormatFloat(preview_direction_deg_, 0) +
			L"deg / Selected Resolved: <none> / Last Pool Stress Drop: " +
			std::to_wstring(last_pool_stress_dropped_count_);
	}

	return L"Preview Dir: " + FormatFloat(preview_direction_deg_, 0) +
		L"deg / Selected Resolved: " + FormatFloat(_ResolvePreviewDirectionDeg(*event_spec), 0) +
		L"deg / Influence: " + FormatFloat(event_spec->direction_influence_, 2) +
		L" / Last Pool Stress Drop: " + std::to_wstring(last_pool_stress_dropped_count_);
}

_float ParticleStationScene::_ResolvePreviewDirectionDeg(const ParticleEventSpec& _event) const
{
	auto direction_deg = _event.base_direction_deg_;
	if (_event.direction_mode_ == ParticleEventDirectionMode::PlayContext)
		direction_deg += preview_direction_deg_ * std::clamp(_event.direction_influence_, 0.f, 1.f);

	return NormalizeDegree(direction_deg);
}

void ParticleStationScene::_DrawPreviewDirectionGuide(const Resolution& _resolution) const
{
	if (_resolution.width <= 0 || _resolution.height <= 0)
		return;

	const _Vector2 center(s_float(_resolution.width) * 0.5f, s_float(_resolution.height) * 0.5f);
	const auto preview_angle = _MathFunc::ToRadian(preview_direction_deg_);
	const _Vector2 preview_dir(cosf(preview_angle), sinf(preview_angle));
	const auto preview_end = center + preview_dir * 110.f;

	_DrawFunc::DrawLine(_Point(center), _Point(preview_end), Palette::Yellow, 2.f);
	_DrawFunc::FillCircle(_Point(center), 4.f, Palette::Yellow);
	_DrawFunc::FillCircle(_Point(preview_end), 5.f, Palette::Yellow);
	_DrawFunc::DrawString(
		_Point(s_int(preview_end.x) + 8, s_int(preview_end.y) - 8),
		L"Preview " + FormatFloat(preview_direction_deg_, 0) + L"deg",
		Palette::Yellow,
		12.f,
		false);

	const auto* event_spec = _GetSelectedEvent();
	if (event_spec == nullptr)
		return;

	const auto resolved_direction_deg = _ResolvePreviewDirectionDeg(*event_spec);
	const auto resolved_angle = _MathFunc::ToRadian(resolved_direction_deg);
	const _Vector2 resolved_dir(cosf(resolved_angle), sinf(resolved_angle));
	const auto resolved_end = center + resolved_dir * 82.f;

	_DrawFunc::DrawLine(_Point(center), _Point(resolved_end), Palette::LightBlue, 2.f);
	_DrawFunc::FillCircle(_Point(resolved_end), 4.f, Palette::LightBlue);
	_DrawFunc::DrawString(
		_Point(s_int(resolved_end.x) + 8, s_int(resolved_end.y) + 8),
		L"Resolved " + FormatFloat(resolved_direction_deg, 0) + L"deg",
		Palette::LightBlue,
		12.f,
		false);
}
