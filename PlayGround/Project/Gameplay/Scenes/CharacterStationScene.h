#pragma once

#include "Scene.h"

enum class CharacterStationMode
{
	Playable = 0,
	Enemy,
	Count,
};

class CharacterStationScene final : public Scene
{
public:
	explicit CharacterStationScene() : Scene(SceneType::CharacterStation) {}

public:
	_bool Initialize() override;
	_int Update(_double _delta_time) override;
	void Render(_double _delta_time) override;
	void OnEnter() override;
	void OnExit() override;

private:
	struct ResourceSequenceCandidate
	{
		std::string directory_;
		std::string prefix_;
		_int start_index_ = 1;
		_int end_index_ = 1;
		_int frame_count_ = 0;
		_int missing_count_ = 0;
	};

	void _RegisterDebugWindows();
	void _RemoveDebugWindows();
	void _BuildCharacterWindow();

	void _RequestExitToIntro();
	void _RequestReload();
	void _ReloadData();
	void _SaveCurrentModeData();
	void _SaveAllData();
	void _CaptureBaseline();
	void _CapturePlayableBaseline();
	void _CaptureEnemyBaseline();
	void _RefreshSelection(_bool _force_first_valid);
	void _RefreshPreviewSprite();
	void _ResetPreviewAnimation();
	void _AdvancePreviewAnimation(_double _delta_time);

	std::vector<_uint> _GetSortedPlayableIds() const;
	std::vector<_uint> _GetSortedEnemyIds() const;
	std::vector<std::wstring> _GetModeLabels() const;
	std::vector<std::wstring> _GetCharacterLabels() const;
	std::vector<std::wstring> _GetClipLabels() const;
	std::vector<std::wstring> _GetNavModeLabels() const;
	std::vector<std::wstring> _GetMovementPatternLabels() const;
	std::vector<std::wstring> _GetProjectilePatternLabels() const;
	std::vector<std::wstring> _GetPreviewStateLabels() const;
	std::vector<ResourceSequenceCandidate> _GetResourceSequenceCandidates() const;
	std::vector<ResourceSequenceCandidate> _GetFilteredResourceSequenceCandidates() const;
	std::vector<ResourceSequenceCandidate> _GetVisibleResourceSequenceCandidates() const;
	std::vector<std::wstring> _GetResourceSequenceLabels() const;
	std::wstring _GetResourceSequenceSummary() const;
	std::wstring _GetResourceSequenceLabel(const ResourceSequenceCandidate& _candidate) const;
	_int _GetSelectedModeIndex() const;
	void _SetSelectedModeIndex(_int _index);
	_int _GetSelectedCharacterIndex() const;
	void _SetSelectedCharacterIndex(_int _index);
	_int _GetSelectedClipIndex() const;
	void _SetSelectedClipIndex(_int _index);
	_int _GetSelectedPreviewStateIndex() const;
	void _SetSelectedPreviewStateIndex(_int _index);
	_int _GetSelectedResourceSequenceIndex() const;
	void _SetSelectedResourceSequenceIndex(_int _index);
	void _MoveResourceSequencePage(_int _delta);
	void _FocusResourceSequenceOnSelectedClip();

	const struct UnitJsonInfo* _GetSelectedUnitInfo() const;
	const struct PlayableCharacterJsonInfo* _GetSelectedPlayableInfo() const;
	const struct EnemyJsonInfo* _GetSelectedEnemyInfo() const;
	const struct AnimationClipPathInfo* _GetSelectedClipInfo() const;
	const std::vector<struct AnimationClipPathInfo>* _GetSelectedClipList() const;
	std::wstring _GetSelectedSummary() const;
	std::wstring _GetPreviewResourceSummary() const;
	std::wstring _GetSelectedClipSummary() const;
	std::wstring _GetDirtySummary() const;
	std::wstring _GetCurrentDiffSummary() const;
	std::wstring _GetValidationReport() const;
	std::wstring _GetFrameCheckSummary() const;
	_float _GetRuntimeBodyRadiusX() const;
	_float _GetRuntimeBodyYRatio() const;
	_float _GetRuntimeBodyCenterOffsetY() const;
	_float _GetCurrentBodySize() const;
	_float _GetCurrentEnemyVisualScale() const;
	_Vector2 _GetProjectileMuzzleOffset() const;

	const struct SpriteResource* _TryLoadPreviewSprite(const std::wstring& _path) const;
	const struct SpriteResource* _TryLoadAnimationPreview(std::wstring& _out_path) const;
	const struct SpriteResource* _TryLoadLegacyPreview(std::wstring& _out_path) const;
	std::wstring _BuildClipFramePath(const struct AnimationClipPathInfo& _clip_info, _int _frame_index) const;
	_int _ResolvePreviewFrameIndex(const struct AnimationClipPathInfo& _clip_info) const;
	_bool _FramePathExists(const std::wstring& _path) const;
	_bool _SelectClipByName(const std::wstring& _clip_name);
	std::string _GetResourceSequenceKey(const ResourceSequenceCandidate& _candidate) const;
	_bool _DoesResourceCandidateMatchSelectedClip(const ResourceSequenceCandidate& _candidate) const;
	_bool _DoesResourceCandidateMatchCurrentCharacter(const ResourceSequenceCandidate& _candidate) const;
	_bool _DoesResourceCandidateMatchFilter(const ResourceSequenceCandidate& _candidate) const;
	_bool _TryGetSelectedResourceSequenceCandidate(ResourceSequenceCandidate& _out_candidate) const;

	void _UpdateSelectedPlayable(const std::function<void(struct PlayableCharacterJsonInfo&)>& _mutator);
	void _UpdateSelectedEnemy(const std::function<void(struct EnemyJsonInfo&)>& _mutator);
	void _UpdateSelectedUnit(const std::function<void(struct UnitJsonInfo&)>& _mutator);
	void _UpdateSelectedClip(const std::function<void(struct AnimationClipPathInfo&)>& _mutator);
	void _AddClip();
	void _DuplicateClip();
	void _RemoveClip();
	void _ApplyResourceCandidateToSelectedClip(const ResourceSequenceCandidate& _candidate);
	struct AnimationClipPathInfo _MakeDefaultClip(const std::string& _name_hint = "idle") const;
	void _CreateNewPlayable();
	void _CreateNewEnemy();
	void _DuplicateCurrentAsNewId();
	void _ApplyBalancedPreset();
	void _ApplyFastPreset();
	void _ApplyShooterPreset();
	void _ApplyTankPreset();
	void _RevertCurrent();
	void _RevertMode();
	_uint _GetNextPlayableId() const;
	_uint _GetNextEnemyId() const;
	void _OnDataEdited(const std::wstring& _message);
	_bool _IsPlayableDirty() const;
	_bool _IsEnemyDirty() const;
	_bool _IsAnyDirty() const;
	_bool _IsCurrentDirty() const;

	void _DrawPreview(const Resolution& _resolution) const;
	void _DrawPreviewGuides(const _Point& _center) const;
	void _DrawProjectileMuzzleGuide(const _Point& _center) const;
	void _DrawProjectileTestGuide(const _Point& _center) const;

private:
	static constexpr _float kStagePlayerBodyRadiusX = 20.f;
	static constexpr _float kDefaultColliderYRatio = 0.6f;

	CharacterStationMode mode_ = CharacterStationMode::Playable;
	_bool previous_debug_mode_ = false;
	_bool debug_windows_registered_ = false;
	_uint selected_playable_id_ = 0;
	_uint selected_enemy_id_ = 0;
	size_t selected_clip_index_ = 0;
	_int selected_preview_state_index_ = 0;
	std::wstring resource_sequence_filter_;
	_bool show_current_character_resources_only_ = false;
	_int resource_sequence_page_ = 0;
	std::string selected_resource_sequence_key_;

	const SpriteResource* preview_sprite_ = nullptr;
	std::wstring preview_sprite_path_;
	std::wstring preview_sprite_source_;
	_bool preview_animation_playing_ = true;
	_double preview_animation_elapsed_ = 0.0;
	_double projectile_preview_elapsed_ = 0.0;

	_bool show_body_guide_ = true;
	_bool show_nav_guide_ = true;
	_bool show_visual_bounds_guide_ = true;
	_bool show_attack_range_guide_ = true;
	_bool show_collector_range_guide_ = true;
	_bool show_muzzle_guide_ = true;
	_bool show_projectile_test_guide_ = true;
	_bool show_frame_bounds_guide_ = false;

	_bool pending_reload_confirm_ = false;
	_bool pending_exit_confirm_ = false;
	std::unordered_map<_uint, struct PlayableCharacterJsonInfo> baseline_playable_table_;
	std::unordered_map<_uint, struct EnemyJsonInfo> baseline_enemy_table_;

	std::wstring status_text_;
	_Color status_color_ = Palette::White;
};
