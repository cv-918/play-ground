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
	void _RegisterDebugWindows();
	void _RemoveDebugWindows();
	void _BuildCharacterWindow();

	void _ReloadData();
	void _RefreshSelection(_bool _force_first_valid);
	void _RefreshPreviewSprite();

	std::vector<_uint> _GetSortedPlayableIds() const;
	std::vector<_uint> _GetSortedEnemyIds() const;
	std::vector<std::wstring> _GetModeLabels() const;
	std::vector<std::wstring> _GetCharacterLabels() const;
	_int _GetSelectedModeIndex() const;
	void _SetSelectedModeIndex(_int _index);
	_int _GetSelectedCharacterIndex() const;
	void _SetSelectedCharacterIndex(_int _index);

	const struct UnitJsonInfo* _GetSelectedUnitInfo() const;
	std::wstring _GetSelectedSummary() const;
	std::wstring _GetPreviewResourceSummary() const;
	_float _GetRuntimeBodyRadiusX() const;
	_float _GetRuntimeBodyYRatio() const;
	_float _GetCurrentBodySize() const;

	const struct SpriteResource* _TryLoadPreviewSprite(const std::wstring& _path) const;
	const struct SpriteResource* _TryLoadPlayableAnimationPreview(std::wstring& _out_path) const;

	void _DrawPreview(const Resolution& _resolution) const;
	void _DrawPreviewGuides(const _Point& _center) const;

private:
	static constexpr _float kStagePlayerBodyRadiusX = 20.f;
	static constexpr _float kDefaultColliderYRatio = 0.6f;

	CharacterStationMode mode_ = CharacterStationMode::Playable;
	_bool previous_debug_mode_ = false;
	_bool debug_windows_registered_ = false;
	_uint selected_playable_id_ = 0;
	_uint selected_enemy_id_ = 0;

	const SpriteResource* preview_sprite_ = nullptr;
	std::wstring preview_sprite_path_;
	std::wstring preview_sprite_source_;
	std::wstring status_text_;
	_Color status_color_ = Palette::White;
};
