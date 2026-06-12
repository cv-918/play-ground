#include "framework.h"
#include "OutGameLayoutStationScene.h"

#include <iomanip>
#include <sstream>

#include "GamePlay/World/Background.h"
#include "GamePlay/GamePlaySystems/Json/PlayableCharacterDataManager.h"
#include "App/EntryPoint.h"
#include "EngineSystems/Render/ScreenSystem.h"

namespace
{
	constexpr char kFallbackOutGameLayoutPath[] = "Data/OutGameLayout.json";
	constexpr _float kMinInteractionRadiusX = 4.f;
	constexpr _float kMinInteractionYRatio = 0.10f;
	constexpr _float kMaxInteractionYRatio = 2.00f;

	std::wstring FormatFloat(_float _value, _int _precision = 2)
	{
		std::wstringstream stream;
		stream << std::fixed << std::setprecision(_precision) << _value;
		return stream.str();
	}

	_bool IsShiftPressed()
	{
		return _InputMgr.Pressed(VK_SHIFT) || _InputMgr.Pressed(VK_LSHIFT) || _InputMgr.Pressed(VK_RSHIFT);
	}
}

_bool OutGameLayoutStationScene::Initialize()
{
	if (!__super::Initialize())
		return false;

	_LoadWorkingLayoutFromManager();
	_SetStatus(L"OutGameLayoutStation ready. Drag rect/ellipses, F9 save, F5 reload.", Palette::Green);

	MAKE_INITIALIZED;
	return true;
}

_int OutGameLayoutStationScene::Update(_double _delta_time)
{
	const auto ret = __super::Update(_delta_time);
	if (ret != UPDATE_CONTINUE)
		return ret;

	UNREFERENCED_PARAMETER(_delta_time);
	_HandleInput();
	return UPDATE_CONTINUE;
}

void OutGameLayoutStationScene::Render(_double _delta_time)
{
	__super::Render(_delta_time);
	_RenderOverlay();
	_RenderHud();
}

void OutGameLayoutStationScene::OnEnter()
{
	previous_debug_mode_ = _GameState.debug_mode_;
	_GameState.debug_mode_ = true;
	_SetupCamera();
	_CreateBackground();
	SetGameCursorVisible(true);
	_SYSTEM_LOG_INFO(L"Entered OutGameLayoutStationScene.");
}

void OutGameLayoutStationScene::OnExit()
{
	_GameState.debug_mode_ = previous_debug_mode_;
	_CameraMgr.ClearFollowTarget();
	background_ = nullptr;
	is_dragging_ = false;
}

void OutGameLayoutStationScene::_LoadWorkingLayoutFromManager()
{
	working_layout_ = _OutGameLayoutDataMgr.GetOutGameLayout();
	if (working_layout_.npcs_.empty())
		selected_npc_index_ = 0;
	else
		selected_npc_index_ = std::min(selected_npc_index_, working_layout_.npcs_.size() - 1);

	dirty_ = false;
}

void OutGameLayoutStationScene::_ReloadLayout()
{
	const std::string path = _OutGameLayoutDataMgr.LoadedFilePath().empty()
		? std::string(kFallbackOutGameLayoutPath)
		: _OutGameLayoutDataMgr.LoadedFilePath();

	if (!_OutGameLayoutDataMgr.Load(path))
	{
		_SetStatus(L"Reload failed: " + _UtilFunc::ToWString(path), Palette::Red);
		return;
	}

	_LoadWorkingLayoutFromManager();
	_CreateBackground();
	_SetStatus(L"Reloaded: " + _UtilFunc::ToWString(path), Palette::Green);
}

void OutGameLayoutStationScene::_SaveLayout()
{
	const std::string path = _OutGameLayoutDataMgr.LoadedFilePath().empty()
		? std::string(kFallbackOutGameLayoutPath)
		: _OutGameLayoutDataMgr.LoadedFilePath();

	_OutGameLayoutDataMgr.EditOutGameLayout() = working_layout_;
	if (!_OutGameLayoutDataMgr.Save(path))
	{
		_SetStatus(L"Save failed: " + _UtilFunc::ToWString(path), Palette::Red);
		return;
	}

	dirty_ = false;
	_SetStatus(L"Saved: " + _UtilFunc::ToWString(path), Palette::Green);
}

void OutGameLayoutStationScene::_CreateBackground()
{
	const Resolution res = _ScreenSystem.WindowResolution();
	if (res.width <= 0 || res.height <= 0)
		return;

	Background::CreateInfo background_info;
	background_info.background_path_ = Path::World + working_layout_.background_path_;
	background_info.nav_mesh_size_ = _Size(res.width, res.height);
	background_info.nav_mesh_center_ = _Point(background_info.nav_mesh_size_.x >> 1, background_info.nav_mesh_size_.y >> 1);
	background_info.render_dest_rect_ = _RectF(0.f, 0.f, s_float(res.width), s_float(res.height));

	background_ = object_manager_->CreateActor<Background>(background_info);
	if (background_ == nullptr)
		_SetStatus(L"Background create failed.", Palette::Red);
}

void OutGameLayoutStationScene::_SetupCamera() const
{
	const Resolution res = _ScreenSystem.WindowResolution();
	if (res.width <= 0 || res.height <= 0)
		return;

	_CameraMgr.Initialize(res.width, res.height);
	_CameraMgr.SetWorldBounds(RECT{ 0, 0, res.width, res.height });
	_CameraMgr.EnableClamp(true);
	_CameraMgr.ClearFollowTarget();
}

void OutGameLayoutStationScene::_HandleInput()
{
	if (_Assist.IsKeyboardCaptured())
		return;

	if (_InputMgr.Down(VK_ESCAPE))
	{
		_SceneMgr.ChangeScene(SceneType::Intro);
		return;
	}

	if (_InputMgr.Down(VK_F5))
		_ReloadLayout();

	if (_InputMgr.Down(VK_F9) || (_InputMgr.Pressed(VK_CONTROL) && _InputMgr.Down('S')))
		_SaveLayout();

	_HandleSelectionInput();
	_HandleKeyboardEditInput();
	_HandleMouseEditInput();
}

void OutGameLayoutStationScene::_HandleSelectionInput()
{
	if (_InputMgr.Down('1'))
		_SelectPlayerWalkableRect();

	if (_InputMgr.Down('2'))
	{
		if (working_layout_.npcs_.empty())
			return;

		if (selection_kind_ != SelectionKind::NpcInteractionArea)
			_SelectNpcInteractionArea(0);
		else
			_SelectNpcInteractionArea((selected_npc_index_ + 1) % working_layout_.npcs_.size());
	}

	if (_InputMgr.Down(VK_TAB))
		_SelectNext();
}

void OutGameLayoutStationScene::_HandleKeyboardEditInput()
{
	const _float move_step = IsShiftPressed() ? 10.f : 1.f;
	_Vector2 delta = _Vector2::Zero();

	if (_InputMgr.Down(VK_LEFT))
		delta.x -= move_step;
	if (_InputMgr.Down(VK_RIGHT))
		delta.x += move_step;
	if (_InputMgr.Down(VK_UP))
		delta.y -= move_step;
	if (_InputMgr.Down(VK_DOWN))
		delta.y += move_step;

	if (delta.LengthSq() > 0.f)
		_MoveSelection(delta);

	if (_InputMgr.Down(VK_OEM_4)) // [
		_AdjustSelectedRadius(-move_step);
	if (_InputMgr.Down(VK_OEM_6)) // ]
		_AdjustSelectedRadius(move_step);
	if (_InputMgr.Down(VK_OEM_MINUS))
		_AdjustSelectedYRatio(-0.05f);
	if (_InputMgr.Down(VK_OEM_PLUS))
		_AdjustSelectedYRatio(0.05f);
}

void OutGameLayoutStationScene::_HandleMouseEditInput()
{
	const _Point mouse = _InputMgr.MousePointDesign();

	if (_InputMgr.Down(VK_LBUTTON))
	{
		size_t npc_index = 0;
		if (_HitTestNpcInteractionArea(mouse, &npc_index))
			_SelectNpcInteractionArea(npc_index);
		else if (_HitTestPlayerWalkableRect(mouse))
			_SelectPlayerWalkableRect();

		is_dragging_ = _HitTestPlayerWalkableRect(mouse) || _HitTestNpcInteractionArea(mouse, nullptr);
		last_drag_mouse_ = mouse;
	}

	if (_InputMgr.Up(VK_LBUTTON))
		is_dragging_ = false;

	if (!is_dragging_ || !_InputMgr.Pressed(VK_LBUTTON))
		return;

	const _Vector2 delta(
		s_float(mouse.x - last_drag_mouse_.x),
		s_float(mouse.y - last_drag_mouse_.y));
	if (delta.LengthSq() > 0.f)
	{
		_MoveSelection(delta);
		last_drag_mouse_ = mouse;
	}
}

void OutGameLayoutStationScene::_SelectNext()
{
	if (selection_kind_ == SelectionKind::PlayerWalkableRect)
	{
		if (!working_layout_.npcs_.empty())
			_SelectNpcInteractionArea(0);
		return;
	}

	if (working_layout_.npcs_.empty() || selected_npc_index_ + 1 >= working_layout_.npcs_.size())
		_SelectPlayerWalkableRect();
	else
		_SelectNpcInteractionArea(selected_npc_index_ + 1);
}

void OutGameLayoutStationScene::_SelectPlayerWalkableRect()
{
	selection_kind_ = SelectionKind::PlayerWalkableRect;
	_SetStatus(L"Selected player walkable rect.", Palette::Orange);
}

void OutGameLayoutStationScene::_SelectNpcInteractionArea(size_t _npc_index)
{
	if (working_layout_.npcs_.empty())
		return;

	selection_kind_ = SelectionKind::NpcInteractionArea;
	selected_npc_index_ = std::min(_npc_index, working_layout_.npcs_.size() - 1);
	_SetStatus(L"Selected NPC interaction: " + _UtilFunc::ToWString(working_layout_.npcs_[selected_npc_index_].placement_id_), Palette::Green);
}

_bool OutGameLayoutStationScene::_HasNpcSelection() const
{
	return selection_kind_ == SelectionKind::NpcInteractionArea && selected_npc_index_ < working_layout_.npcs_.size();
}

OutGameLayoutNpcEntry* OutGameLayoutStationScene::_GetSelectedNpc()
{
	if (!_HasNpcSelection())
		return nullptr;
	return &working_layout_.npcs_[selected_npc_index_];
}

const OutGameLayoutNpcEntry* OutGameLayoutStationScene::_GetSelectedNpc() const
{
	if (!_HasNpcSelection())
		return nullptr;
	return &working_layout_.npcs_[selected_npc_index_];
}

void OutGameLayoutStationScene::_MoveSelection(const _Vector2& _delta)
{
	if (selection_kind_ == SelectionKind::PlayerWalkableRect)
	{
		working_layout_.player_walkable_rect_.left_ += s_int(std::round(_delta.x));
		working_layout_.player_walkable_rect_.right_ += s_int(std::round(_delta.x));
		working_layout_.player_walkable_rect_.top_ += s_int(std::round(_delta.y));
		working_layout_.player_walkable_rect_.bottom_ += s_int(std::round(_delta.y));
		dirty_ = true;
		return;
	}

	auto* npc = _GetSelectedNpc();
	if (npc == nullptr)
		return;

	npc->interaction_area_.center_offset_ += _delta;
	dirty_ = true;
}

void OutGameLayoutStationScene::_AdjustSelectedRadius(_float _delta)
{
	auto* npc = _GetSelectedNpc();
	if (npc == nullptr)
		return;

	npc->interaction_area_.radius_x_ = std::max(kMinInteractionRadiusX, npc->interaction_area_.radius_x_ + _delta);
	dirty_ = true;
}

void OutGameLayoutStationScene::_AdjustSelectedYRatio(_float _delta)
{
	auto* npc = _GetSelectedNpc();
	if (npc == nullptr)
		return;

	npc->interaction_area_.y_ratio_ = _MathFunc::Clamp(npc->interaction_area_.y_ratio_ + _delta, kMinInteractionYRatio, kMaxInteractionYRatio);
	dirty_ = true;
}

void OutGameLayoutStationScene::_RenderOverlay() const
{
	_DrawFunc::SetGlobalOffset(_Point::Zero());
	_RenderPlayerWalkableRect();
	_RenderNpcInteractionAreas();
}

void OutGameLayoutStationScene::_RenderPlayerWalkableRect() const
{
	const _Rect raw_screen_rect = _WorldRectToScreenRect(working_layout_.player_walkable_rect_.ToRect());
	const _Rect effective_screen_rect = _WorldRectToScreenRect(_BuildEffectivePlayerMovableRect());
	const _bool selected = selection_kind_ == SelectionKind::PlayerWalkableRect;

	// Yellow/orange: raw layout data saved to OutGameLayout.json.
	_DrawFunc::DrawRectangle(raw_screen_rect, selected ? Palette::Yellow : Palette::Orange, selected ? 4.f : 2.f);

	// Aqua: runtime Movement debug equivalent after player footprint / visual margins are subtracted.
	_DrawFunc::DrawRectangle(effective_screen_rect, Palette::Aqua, 1.5f);
}

void OutGameLayoutStationScene::_RenderNpcInteractionAreas() const
{
	for (size_t i = 0; i < working_layout_.npcs_.size(); ++i)
	{
		const auto& npc = working_layout_.npcs_[i];
		const _Vector2 npc_pos = _ResolveNpcPosition(npc);
		const _Point npc_screen = _CameraMgr.WorldToScreen(npc_pos);
		const _Rect ellipse_rect = _WorldRectToScreenRect(_BuildInteractionEllipseRect(npc));
		const _bool selected = _HasNpcSelection() && selected_npc_index_ == i;

		_DrawFunc::DrawLine(_Point(npc_screen.x - 8, npc_screen.y), _Point(npc_screen.x + 8, npc_screen.y), Palette::LightBlue, 2.f);
		_DrawFunc::DrawLine(_Point(npc_screen.x, npc_screen.y - 8), _Point(npc_screen.x, npc_screen.y + 8), Palette::LightBlue, 2.f);
		_DrawFunc::DrawEllipse(ellipse_rect, selected ? Palette::Yellow : Palette::Green, selected ? 4.f : 2.f);
		_DrawFunc::DrawString(_Point(npc_screen.x, npc_screen.y - 18), _UtilFunc::ToWString(npc.npc_id_), Palette::White, 12.f, true);
	}
}

void OutGameLayoutStationScene::_RenderHud() const
{
	_DrawFunc::SetGlobalOffset(_Point::Zero());
	_DrawFunc::DrawString(_Point(24, 20), L"OutGameLayoutStation", Palette::White, 24.f, false);
	_DrawFunc::DrawString(_Point(24, 54), L"1 RawWalkable(yellow) + EffectiveRuntime(aqua) | 2/Tab NPC | Drag move | Arrows nudge | [ ] radius | - = yRatio | F5 reload | F9/Ctrl+S save | Esc Intro", Palette::White, 13.f, false);
	_DrawFunc::DrawString(_Point(24, 82), _GetSelectionSummary(), dirty_ ? Palette::Yellow : Palette::LightBlue, 14.f, false);
	_DrawFunc::DrawString(_Point(24, 108), status_text_, status_color_, 14.f, false);
}

_Rect OutGameLayoutStationScene::_BuildEffectivePlayerMovableRect() const
{
	const _Rect raw_rect = working_layout_.player_walkable_rect_.ToRect();
	const auto* player_info = _CharacterDagaMgr.GetDefaultPlayableCharacterData();
	if (player_info == nullptr)
		return raw_rect;

	_float margin_x = std::max(0.f, player_info->nav_footprint_radius_);
	_float margin_y = std::max(0.f, player_info->nav_footprint_radius_);
	if (player_info->nav_boundary_mode_ == NavBoundaryMode::ContainVisualBounds)
	{
		margin_x += std::max(0.f, player_info->nav_visual_margin_x_);
		margin_y += std::max(0.f, player_info->nav_visual_margin_y_);
	}

	const _float min_x = raw_rect.Left_f() + margin_x;
	const _float max_x = raw_rect.Right_f() - margin_x;
	const _float min_y = raw_rect.Top_f() + margin_y;
	const _float max_y = raw_rect.Bottom_f() - margin_y;
	if (min_x > max_x || min_y > max_y)
		return raw_rect;

	return _Rect(
		s_int(std::round(min_x)),
		s_int(std::round(min_y)),
		s_int(std::round(max_x)),
		s_int(std::round(max_y)));
}

_Rect OutGameLayoutStationScene::_WorldRectToScreenRect(const _Rect& _world_rect) const
{
	const _Point lt = _CameraMgr.WorldToScreen(_Vector2(_world_rect.Left_f(), _world_rect.Top_f()));
	const _Point rb = _CameraMgr.WorldToScreen(_Vector2(_world_rect.Right_f(), _world_rect.Bottom_f()));
	return _Rect(lt, rb);
}

_Rect OutGameLayoutStationScene::_BuildInteractionEllipseRect(const OutGameLayoutNpcEntry& _npc) const
{
	const _Vector2 center = _ResolveNpcPosition(_npc) + _npc.interaction_area_.center_offset_;
	const _float radius_x = std::max(kMinInteractionRadiusX, _npc.interaction_area_.radius_x_);
	const _float radius_y = radius_x * std::max(kMinInteractionYRatio, _npc.interaction_area_.y_ratio_);
	return _Rect(
		s_int(std::round(center.x - radius_x)),
		s_int(std::round(center.y - radius_y)),
		s_int(std::round(center.x + radius_x)),
		s_int(std::round(center.y + radius_y)));
}

_Vector2 OutGameLayoutStationScene::_ResolveNpcPosition(const OutGameLayoutNpcEntry& _npc) const
{
	return _Vector2(_npc.position_.x, _npc.position_.y);
}

_bool OutGameLayoutStationScene::_HitTestPlayerWalkableRect(const _Point& _point) const
{
	return working_layout_.player_walkable_rect_.ToRect().PtInRect(_point);
}

_bool OutGameLayoutStationScene::_HitTestNpcInteractionArea(const _Point& _point, size_t* _out_index) const
{
	for (size_t i = 0; i < working_layout_.npcs_.size(); ++i)
	{
		const auto& npc = working_layout_.npcs_[i];
		const _Vector2 center = _ResolveNpcPosition(npc) + npc.interaction_area_.center_offset_;
		const _float radius_x = std::max(kMinInteractionRadiusX, npc.interaction_area_.radius_x_);
		const _float y_ratio = std::max(kMinInteractionYRatio, npc.interaction_area_.y_ratio_);
		const _float dx = s_float(_point.x) - center.x;
		const _float dy = (s_float(_point.y) - center.y) / y_ratio;
		if ((dx * dx + dy * dy) <= radius_x * radius_x)
		{
			if (_out_index != nullptr)
				*_out_index = i;
			return true;
		}
	}

	return false;
}

void OutGameLayoutStationScene::_SetStatus(const std::wstring& _text, const _Color& _color)
{
	status_text_ = _text;
	status_color_ = _color;
}

std::wstring OutGameLayoutStationScene::_GetSelectionSummary() const
{
	if (selection_kind_ == SelectionKind::PlayerWalkableRect)
	{
		const auto& rect = working_layout_.player_walkable_rect_;
		return L"Selected WalkableRect L:" + std::to_wstring(rect.left_) +
			L" T:" + std::to_wstring(rect.top_) +
			L" R:" + std::to_wstring(rect.right_) +
			L" B:" + std::to_wstring(rect.bottom_) +
			(dirty_ ? L" *dirty" : L"");
	}

	const auto* npc = _GetSelectedNpc();
	if (npc == nullptr)
		return L"No NPC selected";

	return L"Selected NPC " + _UtilFunc::ToWString(npc->placement_id_) +
		L" offset:(" + FormatFloat(npc->interaction_area_.center_offset_.x) +
		L", " + FormatFloat(npc->interaction_area_.center_offset_.y) +
		L") radius:" + FormatFloat(npc->interaction_area_.radius_x_) +
		L" yRatio:" + FormatFloat(npc->interaction_area_.y_ratio_) +
		(dirty_ ? L" *dirty" : L"");
}
