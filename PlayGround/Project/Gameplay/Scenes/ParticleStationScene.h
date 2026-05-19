#pragma once

#include "Scene.h"

#include "EngineSystems/Render/ParticleEventSetPlayer.h"

class ParticleStationScene final : public Scene
{
public:
	explicit ParticleStationScene() : Scene(SceneType::ParticleStation) {}

public:
	_bool Initialize() override;
	_int Update(_double _delta_time) override;
	void Render(_double _delta_time) override;
	void OnEnter() override;
	void OnExit() override;

private:
	void _LoadInitialSet();
	_bool _LoadSetById(_uint _set_id);
	void _ReloadData();
	void _SaveCurrentSet();
	void _CreateNewSet();

	void _RegisterDebugWindows();
	void _RemoveDebugWindows();
	void _BuildEventSetWindow();
	void _BuildEventEditorWindow();
	void _RefreshTextureOptions();

	void _AddEvent();
	void _RemoveSelectedEvent();
	void _PreviewAtMouse();
	void _PreviewAtCenter();
	void _PreviewAt(const _Vector2& _world_pos, const std::wstring& _location_label);
	void _RunPoolStressPreview();
	void _ResetPreviewEventEnabledFlags(_bool _is_enabled = true);
	void _SyncPreviewEventEnabledFlags(_bool _default_enabled = true);
	_bool _IsEventPreviewEnabled(size_t _event_index) const;
	_bool _IsSelectedEventPreviewEnabled() const;
	void _SetSelectedEventPreviewEnabled(_bool _is_enabled);
	void _ToggleSelectedEventPreviewEnabled();
	_int _GetPreviewEnabledEventCount() const;

	ParticleEventSpec* _GetSelectedEvent();
	const ParticleEventSpec* _GetSelectedEvent() const;
	ParticleEventSpec _CreateDefaultEvent() const;
	_uint _GetNextSetId() const;
	_uint _GetNextEventId() const;
	std::vector<_uint> _GetSortedSetIds() const;
	std::vector<_uint> _GetSortedParticleIds() const;
	void _ApplyParticleSettingToEvent(ParticleEventSpec& _event, const ParticleSetting& _setting) const;

	std::vector<std::wstring> _GetSetOptionLabels() const;
	std::vector<std::wstring> _GetEventListLabels() const;
	std::vector<std::wstring> _GetParticleSourceLabels() const;
	std::vector<std::wstring> _GetPlaybackTypeLabels() const;
	std::vector<std::wstring> _GetDirectionModeLabels() const;
	std::vector<std::wstring> _GetShapeLabels() const;
	std::vector<std::wstring> _GetEaseLabels() const;
	std::vector<std::wstring> _GetTextureLabels() const;

	_int _GetSelectedSetIndex() const;
	void _SetSelectedSetIndex(_int _index);
	_int _GetSelectedEventIndex() const;
	void _SetSelectedEventIndex(_int _index);
	_int _GetSelectedParticleSourceIndex() const;
	void _SetSelectedParticleSourceIndex(_int _index);
	_int _GetSelectedPlaybackTypeIndex() const;
	void _SetSelectedPlaybackTypeIndex(_int _index);
	_int _GetSelectedDirectionModeIndex() const;
	void _SetSelectedDirectionModeIndex(_int _index);
	_int _GetSelectedShapeIndex() const;
	void _SetSelectedShapeIndex(_int _index);
	_int _GetSelectedSizeEaseIndex() const;
	void _SetSelectedSizeEaseIndex(_int _index);
	_int _GetSelectedColorEaseIndex() const;
	void _SetSelectedColorEaseIndex(_int _index);
	_int _GetSelectedTextureIndex() const;
	void _SetSelectedTextureIndex(_int _index);

	void _SetStatus(const std::wstring& _text, const _Color& _color = Palette::White);
	std::wstring _GetSetLabel() const;
	std::wstring _GetEventLabel(const ParticleEventSpec& _event) const;
	std::wstring _GetEventSummary() const;
	std::wstring _GetDirectionPreviewLabel() const;
	_float _ResolvePreviewDirectionDeg(const ParticleEventSpec& _event) const;
	void _DrawPreviewDirectionGuide(const Resolution& _resolution) const;

private:
	ParticleEventSet working_set_;
	_bool has_working_set_ = false;
	_bool previous_debug_mode_ = false;
	_bool debug_windows_registered_ = false;
	_uint selected_set_id_ = 0;
	size_t selected_event_index_ = 0;

	ParticleEventSetPlayer preview_player_;
	std::vector<char> preview_event_enabled_;
	std::vector<std::wstring> texture_options_;
	_float preview_direction_deg_ = 0.f;
	_uint last_pool_stress_dropped_count_ = 0;
	std::wstring status_text_;
	_Color status_color_ = Palette::White;
};
