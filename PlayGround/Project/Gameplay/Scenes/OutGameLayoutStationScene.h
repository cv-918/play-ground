#pragma once

#include "Scene.h"
#include "GamePlaySystems/Json/OutGameLayoutDataManager.h"

class Background;

class OutGameLayoutStationScene final : public Scene
{
private:
	enum class SelectionKind
	{
		PlayerWalkableRect,
		NpcInteractionArea,
	};

public:
	explicit OutGameLayoutStationScene() : Scene(SceneType::OutGameLayoutStation) {}

public:
	_bool Initialize() override;
	_int Update(_double _delta_time) override;
	void Render(_double _delta_time) override;
	void OnEnter() override;
	void OnExit() override;

private:
	void _LoadWorkingLayoutFromManager();
	void _ReloadLayout();
	void _SaveLayout();
	void _CreateBackground();
	void _SetupCamera() const;

	void _HandleInput();
	void _HandleSelectionInput();
	void _HandleKeyboardEditInput();
	void _HandleMouseEditInput();

	void _SelectNext();
	void _SelectPlayerWalkableRect();
	void _SelectNpcInteractionArea(size_t _npc_index);
	_bool _HasNpcSelection() const;
	OutGameLayoutNpcEntry* _GetSelectedNpc();
	const OutGameLayoutNpcEntry* _GetSelectedNpc() const;

	void _MoveSelection(const _Vector2& _delta);
	void _AdjustSelectedRadius(_float _delta);
	void _AdjustSelectedYRatio(_float _delta);

	void _RenderOverlay() const;
	void _RenderPlayerWalkableRect() const;
	void _RenderNpcInteractionAreas() const;
	void _RenderHud() const;

	_Rect _BuildEffectivePlayerMovableRect() const;
	_Rect _WorldRectToScreenRect(const _Rect& _world_rect) const;
	_Rect _BuildInteractionEllipseRect(const OutGameLayoutNpcEntry& _npc) const;
	_Vector2 _ResolveNpcPosition(const OutGameLayoutNpcEntry& _npc) const;
	_bool _HitTestPlayerWalkableRect(const _Point& _point) const;
	_bool _HitTestNpcInteractionArea(const _Point& _point, size_t* _out_index) const;

	void _SetStatus(const std::wstring& _text, const _Color& _color = Palette::White);
	std::wstring _GetSelectionSummary() const;

private:
	OutGameLayoutSceneData working_layout_;
	Background* background_ = nullptr;
	SelectionKind selection_kind_ = SelectionKind::PlayerWalkableRect;
	size_t selected_npc_index_ = 0;
	_bool is_dragging_ = false;
	_Point last_drag_mouse_ = _Point::Zero();
	_bool dirty_ = false;
	_bool previous_debug_mode_ = false;
	std::wstring status_text_;
	_Color status_color_ = Palette::White;
};
