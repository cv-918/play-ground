#include "framework.h"
#include "InputManager.h"

#include <windowsx.h>

namespace
{
	inline _uint ToActionIndex(InputAction _action)
	{
		return s_cast(_uint, _action);
	}

	// MouseOnly 이동 계산 파라미터(픽셀 단위)
	constexpr _float MOUSE_MOVE_DEAD_ZONE = 5.f;
	constexpr _float MOUSE_MOVE_MAX_DISTANCE = 50.f;

	void ReportInputSelfTest(_bool _passed, const char* _name)
	{
		char buffer[256] = {};
		sprintf_s(buffer, "[InputSelfTest] %s : %s\n", _name, _passed ? "PASS" : "FAIL");
		OutputDebugStringA(buffer);
	}

	_bool ExpectInputSelfTest(_bool _condition, const char* _name)
	{
		ReportInputSelfTest(_condition, _name);
		return _condition;
	}
}

void InputManager::BeginFrame()
{
	// 프레임 트리거(눌림/뗌) 초기화
	for (auto& k : keys_)
	{
		k.went_down = false;
		k.went_up = false;
		k.released_hold_seconds = 0.f;
	}

	// 이번 프레임에만 의미가 있는 액션 릴리즈 홀드 값 초기화
	for (auto& a : action_states_)
	{
		a.released_hold_seconds = 0.f;
	}

	// 이번 프레임 문자 입력 버퍼 초기화
	chars_.clear();

	wheel_delta_ = 0;
	mouse_delta_.x = 0;
	mouse_delta_.y = 0;
	prev_mouse_ = mouse_;

	// 이번 프레임 액션 상태는 메시지 처리 후 1회만 동기화한다.
	action_states_dirty_ = true;
}

void InputManager::SyncActionStates(_float _delta_time)
{
	if (!action_states_dirty_)
		return;

	// 홀드 값은 현재 raw 키 상태를 기준으로 먼저 누적한다.
	UpdateKeyHoldStates(_delta_time);

	// 그 다음 프리셋/바인딩을 반영해 액션 상태를 재구성한다.
	RebuildActionStates();

	// 액션 상태가 완성된 뒤 액션 홀드 값도 같은 방식으로 누적한다.
	UpdateActionHoldStates(_delta_time);

	action_states_dirty_ = false;
}

void InputManager::ResetAll()
{
	// 모든 키 상태 초기화(눌림 고정 방지)
	std::fill(keys_.begin(), keys_.end(), KeyState{});

	// 액션 상태도 같이 초기화한다.
	std::fill(action_states_.begin(), action_states_.end(), ActionState{});

	// 눌린 키 카운트도 초기화
	pressed_key_count_ = IV_ZERO;

	// 문자 입력 버퍼도 초기화
	chars_.clear();

	action_states_dirty_ = true;
}

void InputManager::OnMouseMove(WPARAM _wparam, LPARAM _lparam)
{
	mouse_.x = GET_X_LPARAM(_lparam);
	mouse_.y = GET_Y_LPARAM(_lparam);

	// 프레임 내 누적 델타(움직임이 여러 번 오면 누적됨)
	mouse_delta_.x += (mouse_.x - prev_mouse_.x);
	mouse_delta_.y += (mouse_.y - prev_mouse_.y);

	// 마우스 이동이 들어오면 즉시 액션 상태를 재계산한다.
	action_states_dirty_ = true;

	(void)_wparam;
}

void InputManager::OnMouseWheel(WPARAM _wparam, LPARAM _lparam)
{
	// 보통 ±120 단위로 들어옴(휠 한 칸)
	wheel_delta_ += GET_WHEEL_DELTA_WPARAM(_wparam);

	(void)_lparam;
}

void InputManager::SetMouseMoveReferencePoint(const _Point& _point)
{
	const _bool changed = (!has_mouse_move_reference_point_)
		|| (mouse_move_reference_point_.x != _point.x)
		|| (mouse_move_reference_point_.y != _point.y);

	mouse_move_reference_point_ = _point;
	has_mouse_move_reference_point_ = true;

	if (changed)
		action_states_dirty_ = true;
}

void InputManager::OnMouseButtonDown(WPARAM _vk, LPARAM _lparam)
{
	OnKeyDown(_vk, _lparam);
}

void InputManager::OnMouseButtonUp(WPARAM _vk, LPARAM _lparam)
{
	OnKeyUp(_vk, _lparam);
}

void InputManager::OnKeyDown(WPARAM _vk, LPARAM _lparam)
{
	if (_vk > UCHAR_MAX) return;

	// lParam bit 30: 이전 키 상태(1이면 이전에도 눌려있던 상태 -> 자동 반복 포함)
	const bool was_down = (_lparam & (1LL << 30)) != 0;

	auto& k = keys_[s_cast(uint8_t, _vk)];

	// 물리적으로 "처음 눌림"만 Down 트리거로 처리
	if (!k.is_down)
	{
		k.is_down = true;
		k.went_down = true;

		++pressed_key_count_;
		action_states_dirty_ = true;
		return;
	}

	// 이미 눌린 상태에서 들어오는 반복 입력은 보통 무시한다.
	// 텍스트 입력은 WM_CHAR가 담당하므로, 필요하면 was_down 값을 이용해 별도 처리 가능.
	(void)was_down;
}

void InputManager::OnKeyUp(WPARAM _vk, LPARAM _lparam)
{
	if (_vk > UCHAR_MAX) return;

	auto& k = keys_[s_cast(uint8_t, _vk)];
	if (k.is_down)
	{
		k.is_down = false;
		k.went_up = true;

		if (pressed_key_count_ > 0)
			--pressed_key_count_;

		action_states_dirty_ = true;
	}
}

void InputManager::OnChar(_tchar _ch)
{
	// WM_CHAR로 들어온 문자를 프레임 단위로 누적
	chars_.push_back(_ch);
}

bool InputManager::Down(_int _vk) const
{
	if (_vk < 0 || _vk > UCHAR_MAX) return false;
	return keys_[s_cast(uint8_t, _vk)].went_down;
}

bool InputManager::Pressed(_int _vk) const
{
	if (_vk < 0 || _vk > UCHAR_MAX) return false;
	return keys_[s_cast(uint8_t, _vk)].is_down;
}

bool InputManager::Up(_int _vk) const
{
	if (_vk < 0 || _vk > UCHAR_MAX) return false;
	return keys_[s_cast(uint8_t, _vk)].went_up;
}

_int InputManager::HoldFrames(_int _vk) const
{
	if (_vk < 0 || _vk > UCHAR_MAX) return 0;
	return keys_[s_cast(uint8_t, _vk)].hold_frames;
}

_float InputManager::HoldSeconds(_int _vk) const
{
	if (_vk < 0 || _vk > UCHAR_MAX) return 0.f;
	return keys_[s_cast(uint8_t, _vk)].hold_seconds;
}

_bool InputManager::HeldFor(_int _vk, _float _seconds) const
{
	if (_vk < 0 || _vk > UCHAR_MAX) return false;
	if (_seconds <= 0.f) return Pressed(_vk);

	const KeyState& key = keys_[s_cast(uint8_t, _vk)];
	return key.is_down && key.hold_seconds >= _seconds;
}

_bool InputManager::HoldTriggered(_int _vk, _float _seconds) const
{
	if (_vk < 0 || _vk > UCHAR_MAX) return false;
	if (_seconds <= 0.f) return Down(_vk);

	const KeyState& key = keys_[s_cast(uint8_t, _vk)];
	return key.is_down
		&& key.prev_hold_seconds < _seconds
		&& key.hold_seconds >= _seconds;
}

_float InputManager::ReleasedHoldSeconds(_int _vk) const
{
	if (_vk < 0 || _vk > UCHAR_MAX) return 0.f;
	return keys_[s_cast(uint8_t, _vk)].released_hold_seconds;
}

_Point InputManager::MousePointDesign() const
{
	const Resolution design = _ScreenSystem.DesignResolution();
	const Resolution window = _ScreenSystem.WindowResolution();

	if (design.width <= 0 || design.height <= 0)
		return mouse_;

	if (window.width <= 0 || window.height <= 0)
		return mouse_;

	const _float sx = s_cast(_float, design.width) / s_cast(_float, window.width);
	const _float sy = s_cast(_float, design.height) / s_cast(_float, window.height);

	_Point converted;
	converted.x = s_int(std::round(s_cast(_float, mouse_.x) * sx));
	converted.y = s_int(std::round(s_cast(_float, mouse_.y) * sy));

	// 프로젝트의 _Rect::PtInRect가 Right/Bottom 배타 정책이라고 가정한다.
	// 따라서 입력 좌표는 [0, width - 1], [0, height - 1] 범위로 clamp 한다.
	const _int max_x = std::max(0, design.width - 1);
	const _int max_y = std::max(0, design.height - 1);
	converted.x = std::clamp(converted.x, 0, max_x);
	converted.y = std::clamp(converted.y, 0, max_y);

	return converted;
}

void InputManager::SetCurrentPreset(ControllerPreset _preset)
{
	if (current_preset_ == _preset)
		return;

	current_preset_ = _preset;
	action_states_dirty_ = true;
}

bool InputManager::ActionPressed(InputAction _action) const
{
	if (_action >= InputAction::Count)
		return false;

	return action_states_[ToActionIndex(_action)].is_down;
}

bool InputManager::ActionDown(InputAction _action) const
{
	if (_action >= InputAction::Count)
		return false;

	return action_states_[ToActionIndex(_action)].went_down;
}

bool InputManager::ActionReleased(InputAction _action) const
{
	if (_action >= InputAction::Count)
		return false;

	return action_states_[ToActionIndex(_action)].went_up;
}

_float InputManager::ActionValue(InputAction _action) const
{
	if (_action >= InputAction::Count)
		return 0.f;

	return action_states_[ToActionIndex(_action)].value;
}

_int InputManager::ActionHoldFrames(InputAction _action) const
{
	if (_action >= InputAction::Count)
		return 0;

	return action_states_[ToActionIndex(_action)].hold_frames;
}

_float InputManager::ActionHoldSeconds(InputAction _action) const
{
	if (_action >= InputAction::Count)
		return 0.f;

	return action_states_[ToActionIndex(_action)].hold_seconds;
}

_bool InputManager::ActionHeldFor(InputAction _action, _float _seconds) const
{
	if (_action >= InputAction::Count)
		return false;

	if (_seconds <= 0.f)
		return ActionDown(_action);

	const ActionState& state = action_states_[ToActionIndex(_action)];
	return state.is_down && state.hold_seconds >= _seconds;
}

_bool InputManager::ActionHoldTriggered(InputAction _action, _float _seconds) const
{
	if (_action >= InputAction::Count)
		return false;

	if (_seconds <= 0.f)
		return ActionPressed(_action);

	const ActionState& state = action_states_[ToActionIndex(_action)];
	return state.is_down
		&& state.prev_hold_seconds < _seconds
		&& state.hold_seconds >= _seconds;
}

_float InputManager::ActionReleasedHoldSeconds(InputAction _action) const
{
	if (_action >= InputAction::Count)
		return 0.f;

	return action_states_[ToActionIndex(_action)].released_hold_seconds;
}

bool InputManager::IsActionRemappable(ControllerPreset _preset, InputAction _action) const
{
	if (_action >= InputAction::Count)
		return false;

	// MouseOnly는 문서 정책상 remap 자체가 불가하다.
	if (_preset == ControllerPreset::MouseOnly)
		return false;

	// KeyboardMouse는 이동/대시와 상호작용/스테이지 진행 remap을 허용한다.
	if (_preset == ControllerPreset::KeyboardMouse)
	{
		return (_action == InputAction::MoveX)
			|| (_action == InputAction::MoveY)
			|| (_action == InputAction::Dash)
			|| (_action == InputAction::Interact)
			|| (_action == InputAction::StageProgress);
	}

	// 그 외 프리셋은 현재 정책에서 허용한다.
	return true;
}

InputRemapResult InputManager::TryRemapAction(ControllerPreset _preset, InputAction _action, const InputBinding& _new_binding)
{
	if (_action >= InputAction::Count)
		return InputRemapResult::InvalidAction;

	if (!IsActionRemappable(_preset, _action))
		return InputRemapResult::RejectedByPolicy;

	PresetBindingSet* preset_set = FindPresetBindingSet(_preset);
	if (nullptr == preset_set)
		return InputRemapResult::PresetNotFound;

	// 대상 액션의 기존 바인딩을 제거하고 새 바인딩 1개로 교체한다.
	preset_set->bindings.erase(
		std::remove_if(
			preset_set->bindings.begin(),
			preset_set->bindings.end(),
			[_action](const InputBinding& _binding)
			{
				return _binding.action == _action;
			}),
		preset_set->bindings.end());

	InputBinding new_binding = _new_binding;
	new_binding.action = _action;
	preset_set->bindings.push_back(new_binding);

	if (current_preset_ == _preset)
		action_states_dirty_ = true;

	return InputRemapResult::Success;
}

InputRemapResult InputManager::TryRemapBinding(ControllerPreset _preset, const InputBinding& _target_binding, const InputBinding& _new_binding)
{
	if (_target_binding.action >= InputAction::Count)
		return InputRemapResult::InvalidAction;

	if (!IsActionRemappable(_preset, _target_binding.action))
		return InputRemapResult::RejectedByPolicy;

	PresetBindingSet* preset_set = FindPresetBindingSet(_preset);
	if (nullptr == preset_set)
		return InputRemapResult::PresetNotFound;

	for (InputBinding& binding : preset_set->bindings)
	{
		if (binding.action != _target_binding.action)
			continue;

		if (binding.source_type != _target_binding.source_type)
			continue;

		if (binding.source_code != _target_binding.source_code)
			continue;

		if (std::abs(binding.scale - _target_binding.scale) > 0.0001f)
			continue;

		binding.source_type = _new_binding.source_type;
		binding.source_code = _new_binding.source_code;
		binding.scale = _new_binding.scale;
		binding.action = _target_binding.action;

		if (current_preset_ == _preset)
			action_states_dirty_ = true;

		return InputRemapResult::Success;
	}

	return TryRemapAction(_preset, _target_binding.action, _new_binding);
}

bool InputManager::TryGetPrimaryBinding(ControllerPreset _preset, InputAction _action, InputBinding* _out_binding) const
{
	if (nullptr == _out_binding)
		return false;

	if (_action >= InputAction::Count)
		return false;

	const PresetBindingSet* preset_set = FindPresetBindingSet(_preset);
	if (nullptr == preset_set)
		return false;

	for (const InputBinding& binding : preset_set->bindings)
	{
		if (binding.action != _action)
			continue;

		*_out_binding = binding;
		return true;
	}

	return false;
}

bool InputManager::HasBindingConflictExcept(ControllerPreset _preset, const InputBinding& _candidate, const InputBinding& _ignore_binding) const
{
	const PresetBindingSet* preset_set = FindPresetBindingSet(_preset);
	if (nullptr == preset_set)
		return false;

	for (const InputBinding& binding : preset_set->bindings)
	{
		const _bool is_ignore_binding = (binding.action == _ignore_binding.action)
			&& (binding.source_type == _ignore_binding.source_type)
			&& (binding.source_code == _ignore_binding.source_code)
			&& (std::abs(binding.scale - _ignore_binding.scale) <= 0.0001f);

		if (is_ignore_binding)
			continue;

		if (binding.source_type != _candidate.source_type)
			continue;

		if (binding.source_code != _candidate.source_code)
			continue;

		return true;
	}

	return false;
}

bool InputManager::HasBindingConflict(ControllerPreset _preset, const InputBinding& _candidate, InputAction _ignore_action) const
{
	const PresetBindingSet* preset_set = FindPresetBindingSet(_preset);
	if (nullptr == preset_set)
		return false;

	for (const InputBinding& binding : preset_set->bindings)
	{
		if (binding.action == _ignore_action)
			continue;

		if (binding.source_type != _candidate.source_type)
			continue;

		if (binding.source_code != _candidate.source_code)
			continue;

		return true;
	}

	return false;
}

void InputManager::UpdateKeyHoldStates(_float _delta_time)
{
	for (auto& key : keys_)
	{
		key.prev_hold_frames = key.hold_frames;
		key.prev_hold_seconds = key.hold_seconds;

		if (key.is_down)
		{
			++key.hold_frames;

			if (_delta_time > 0.f)
				key.hold_seconds += _delta_time;
		}
		else
		{
			// 이번 프레임에 릴리즈되었다면 릴리즈 직전 홀드 시간을 보존한다.
			if (key.went_up)
				key.released_hold_seconds = key.prev_hold_seconds;

			key.hold_frames = 0;
			key.hold_seconds = 0.f;
		}
	}
}

void InputManager::UpdateActionHoldStates(_float _delta_time)
{
	for (auto& state : action_states_)
	{
		state.prev_hold_frames = state.hold_frames;
		state.prev_hold_seconds = state.hold_seconds;

		if (state.is_down)
		{
			++state.hold_frames;

			if (_delta_time > 0.f)
				state.hold_seconds += _delta_time;
		}
		else
		{
			// 액션도 키와 동일하게 릴리즈 직전 홀드 시간을 1프레임 보존한다.
			if (state.went_up)
				state.released_hold_seconds = state.prev_hold_seconds;

			state.hold_frames = 0;
			state.hold_seconds = 0.f;
		}
	}
}

void InputManager::RebuildActionStates()
{
	// 홀드 관련 누적값은 별도 단계에서 관리하므로,
	// 여기서는 프레임성 상태와 축 값만 재구성한다.
	for (auto& state : action_states_)
	{
		state.is_down = false;
		state.went_down = false;
		state.went_up = false;
		state.value = 0.f;
	}

	const PresetBindingSet* preset_set = FindPresetBindingSet(current_preset_);
	if (nullptr == preset_set)
		return;

	for (const InputBinding& binding : preset_set->bindings)
	{
		if (binding.action >= InputAction::Count)
			continue;

		ActionState& state = action_states_[ToActionIndex(binding.action)];

		switch (binding.source_type)
		{
		case InputSourceType::KeyboardKey:
		case InputSourceType::MouseButton:
		{
			if (binding.source_code < 0 || binding.source_code > UCHAR_MAX)
				continue;

			const KeyState& key = keys_[s_cast(_uint, binding.source_code)];
			state.is_down = state.is_down || key.is_down;
			state.went_down = state.went_down || key.went_down;
			state.went_up = state.went_up || key.went_up;

			if (key.is_down)
				state.value += binding.scale;
			break;
		}
		case InputSourceType::MouseAxis:
			// MouseOnly 이동 축은 아래 전용 블록에서 일괄 계산한다.
			break;
		}
	}

	// MouseOnly 프리셋 이동을 "플레이어-커서 방향 + 거리"로 계산한다.
	if (current_preset_ == ControllerPreset::MouseOnly)
	{
		const _Point mouse_design = MousePointDesign();

		ActionState& move_x = action_states_[ToActionIndex(InputAction::MoveX)];
		ActionState& move_y = action_states_[ToActionIndex(InputAction::MoveY)];

		if (!has_mouse_move_reference_point_)
		{
			move_x.value = 0.f;
			move_y.value = 0.f;
			move_x.is_down = false;
			move_y.is_down = false;
			return;
		}

		const _float dx = s_cast(_float, mouse_design.x - mouse_move_reference_point_.x);
		const _float dy = s_cast(_float, mouse_design.y - mouse_move_reference_point_.y);
		const _float distance = std::sqrt(dx * dx + dy * dy);

		const _float range = MOUSE_MOVE_MAX_DISTANCE - MOUSE_MOVE_DEAD_ZONE;
		if (range <= 0.f)
		{
			move_x.value = 0.f;
			move_y.value = 0.f;
			move_x.is_down = false;
			move_y.is_down = false;
			return;
		}

		// dead zone 이내는 이동 0으로 처리한다.
		if (distance <= MOUSE_MOVE_DEAD_ZONE)
		{
			move_x.value = 0.f;
			move_y.value = 0.f;
			move_x.is_down = false;
			move_y.is_down = false;
			return;
		}

		const _float safe_distance = (distance > 0.f) ? distance : 1.f;
		const _float dir_x = dx / safe_distance;
		const _float dir_y = dy / safe_distance;

		// dead zone 이후 거리를 0~1 범위로 정규화 후 clamp 한다.
		const _float normalized = (distance - MOUSE_MOVE_DEAD_ZONE) / range;
		const _float magnitude = std::clamp(normalized, 0.f, 1.f);

		move_x.value = dir_x * magnitude;
		move_y.value = dir_y * magnitude;
		move_x.is_down = magnitude > 0.f;
		move_y.is_down = magnitude > 0.f;
	}
}

const PresetBindingSet* InputManager::FindPresetBindingSet(ControllerPreset _preset) const
{
	for (const PresetBindingSet& set : default_binding_table_)
	{
		if (set.preset == _preset)
			return &set;
	}

	return nullptr;
}

PresetBindingSet* InputManager::FindPresetBindingSet(ControllerPreset _preset)
{
	for (PresetBindingSet& set : default_binding_table_)
	{
		if (set.preset == _preset)
			return &set;
	}

	return nullptr;
}

PresetDefaultBindingTable InputManager::CreateDefaultPresetBindingTable()
{
	PresetDefaultBindingTable table{};

	// KeyboardA: WASD 이동 + Space 대시 + Q/E 스킬
	{
		PresetBindingSet& set = table[s_cast(_uint, ControllerPreset::KeyboardA)];
		set.preset = ControllerPreset::KeyboardA;
		set.bindings = {
			{ InputAction::MoveY, InputSourceType::KeyboardKey, 'W', -1.f },
			{ InputAction::MoveY, InputSourceType::KeyboardKey, 'S',  1.f },
			{ InputAction::MoveX, InputSourceType::KeyboardKey, 'A', -1.f },
			{ InputAction::MoveX, InputSourceType::KeyboardKey, 'D',  1.f },
			{ InputAction::Dash, InputSourceType::KeyboardKey, VK_SPACE, 1.f },
			{ InputAction::Skill1, InputSourceType::KeyboardKey, 'Q', 1.f },
			{ InputAction::Skill2, InputSourceType::KeyboardKey, 'E', 1.f },
			{ InputAction::Interact, InputSourceType::KeyboardKey, 'E', 1.f},
			{ InputAction::Pause, InputSourceType::KeyboardKey, VK_ESCAPE, 1.f },
			{ InputAction::StageProgress, InputSourceType::KeyboardKey, VK_SPACE, 1.f},
		};
	}

	// KeyboardB: 방향키 이동 + Space 대시 + A/S 스킬
	{
		PresetBindingSet& set = table[s_cast(_uint, ControllerPreset::KeyboardB)];
		set.preset = ControllerPreset::KeyboardB;
		set.bindings = {
			{ InputAction::MoveY, InputSourceType::KeyboardKey, VK_UP, -1.f },
			{ InputAction::MoveY, InputSourceType::KeyboardKey, VK_DOWN,  1.f },
			{ InputAction::MoveX, InputSourceType::KeyboardKey, VK_LEFT, -1.f },
			{ InputAction::MoveX, InputSourceType::KeyboardKey, VK_RIGHT,  1.f },
			{ InputAction::Dash, InputSourceType::KeyboardKey, VK_SPACE, 1.f },
			{ InputAction::Skill1, InputSourceType::KeyboardKey, 'A', 1.f },
			{ InputAction::Skill2, InputSourceType::KeyboardKey, 'S', 1.f },
			{ InputAction::Interact, InputSourceType::KeyboardKey, 'E', 1.f},
			{ InputAction::Pause, InputSourceType::KeyboardKey, VK_ESCAPE, 1.f },
			{ InputAction::StageProgress, InputSourceType::KeyboardKey, VK_SPACE, 1.f},
		};
	}

	// MouseOnly: 마우스 이동 + Mouse4 대시 + Mouse1/Mouse2 스킬
	{
		PresetBindingSet& set = table[s_cast(_uint, ControllerPreset::MouseOnly)];
		set.preset = ControllerPreset::MouseOnly;
		set.bindings = {
			{ InputAction::Dash, InputSourceType::MouseButton, VK_XBUTTON1, 1.f },
			{ InputAction::Skill1, InputSourceType::MouseButton, VK_LBUTTON, 1.f },
			{ InputAction::Skill2, InputSourceType::MouseButton, VK_RBUTTON, 1.f },
			{ InputAction::Interact, InputSourceType::MouseButton, VK_XBUTTON1, 1.f },
			{ InputAction::Pause, InputSourceType::KeyboardKey, VK_ESCAPE, 1.f },
			{ InputAction::StageProgress, InputSourceType::MouseButton, VK_MBUTTON, 1.f},
		};
	}

	// KeyboardMouse: 이동/대시는 키보드, 스킬은 마우스 버튼
	{
		PresetBindingSet& set = table[s_cast(_uint, ControllerPreset::KeyboardMouse)];
		set.preset = ControllerPreset::KeyboardMouse;
		set.bindings = {
			{ InputAction::MoveY, InputSourceType::KeyboardKey, 'W', -1.f },
			{ InputAction::MoveY, InputSourceType::KeyboardKey, 'S',  1.f },
			{ InputAction::MoveX, InputSourceType::KeyboardKey, 'A', -1.f },
			{ InputAction::MoveX, InputSourceType::KeyboardKey, 'D',  1.f },
			{ InputAction::Dash, InputSourceType::KeyboardKey, VK_SPACE, 1.f },
			{ InputAction::Skill1, InputSourceType::MouseButton, VK_LBUTTON, 1.f },
			{ InputAction::Skill2, InputSourceType::MouseButton, VK_RBUTTON, 1.f },
			{ InputAction::Interact, InputSourceType::KeyboardKey, 'E', 1.f},
			{ InputAction::Pause, InputSourceType::KeyboardKey, VK_ESCAPE, 1.f },
			{ InputAction::StageProgress, InputSourceType::KeyboardKey, VK_SPACE, 1.f},
		};
	}

	return table;
}

_bool InputManager::RunSelfTest()
{
	// 테스트 전 기존 상태를 보존하고 종료 시 복원한다.
	const ControllerPreset prev_preset = current_preset_;
	const PresetDefaultBindingTable prev_binding_table = default_binding_table_;
	ResetAll();

	_bool ok = true;

	// [케이스 1] KeyboardA에서 W 입력이 MoveY 음수 축으로 반영되는지 확인
	SetCurrentPreset(ControllerPreset::KeyboardA);
	BeginFrame();
	OnKeyDown('W', 0);
	SyncActionStates();
	ok = ExpectInputSelfTest(ActionPressed(InputAction::MoveY), "KeyboardA.MoveY.Pressed") && ok;
	ok = ExpectInputSelfTest(ActionDown(InputAction::MoveY), "KeyboardA.MoveY.Down") && ok;
	ok = ExpectInputSelfTest(ActionValue(InputAction::MoveY) < -0.5f, "KeyboardA.MoveY.ValueNegative") && ok;

	BeginFrame();
	SyncActionStates();
	ok = ExpectInputSelfTest(!ActionPressed(InputAction::MoveY), "KeyboardA.MoveY.PressedReset") && ok;
	ok = ExpectInputSelfTest(ActionDown(InputAction::MoveY), "KeyboardA.MoveY.DownKeep") && ok;

	OnKeyUp('W', 0);
	SyncActionStates();
	ok = ExpectInputSelfTest(ActionReleased(InputAction::MoveY), "KeyboardA.MoveY.Released") && ok;
	ok = ExpectInputSelfTest(!ActionDown(InputAction::MoveY), "KeyboardA.MoveY.UpAfterRelease") && ok;

	// [케이스 2] MouseOnly dead zone / clamp 동작 확인
	ResetAll();
	SetCurrentPreset(ControllerPreset::MouseOnly);
	SetMouseMoveReferencePoint(_Point{ 100, 100 });
	BeginFrame();
	OnMouseMove(0, MAKELPARAM(103, 104));
	SyncActionStates();
	ok = ExpectInputSelfTest(std::abs(ActionValue(InputAction::MoveX)) < 0.001f, "MouseOnly.DeadZone.MoveX") && ok;
	ok = ExpectInputSelfTest(std::abs(ActionValue(InputAction::MoveY)) < 0.001f, "MouseOnly.DeadZone.MoveY") && ok;

	BeginFrame();
	OnMouseMove(0, MAKELPARAM(200, 100));
	SyncActionStates();
	const _float move_x = ActionValue(InputAction::MoveX);
	const _float move_y = ActionValue(InputAction::MoveY);
	ok = ExpectInputSelfTest(std::abs(move_x) <= 1.0001f, "MouseOnly.Clamp.MoveX") && ok;
	ok = ExpectInputSelfTest(std::abs(move_y) <= 1.0001f, "MouseOnly.Clamp.MoveY") && ok;
	ok = ExpectInputSelfTest(move_x > 0.5f, "MouseOnly.Clamp.DirectionX") && ok;

	// [케이스 3] remap 정책 및 거부 처리 확인
	ResetAll();
	ok = ExpectInputSelfTest(!IsActionRemappable(ControllerPreset::MouseOnly, InputAction::MoveX), "Policy.MouseOnly.Deny") && ok;
	ok = ExpectInputSelfTest(!IsActionRemappable(ControllerPreset::KeyboardMouse, InputAction::Skill1), "Policy.KeyboardMouse.Skill1Deny") && ok;
	ok = ExpectInputSelfTest(IsActionRemappable(ControllerPreset::KeyboardMouse, InputAction::Dash), "Policy.KeyboardMouse.DashAllow") && ok;
	ok = ExpectInputSelfTest(IsActionRemappable(ControllerPreset::KeyboardMouse, InputAction::Interact), "Policy.KeyboardMouse.InteractAllow") && ok;
	ok = ExpectInputSelfTest(IsActionRemappable(ControllerPreset::KeyboardMouse, InputAction::StageProgress), "Policy.KeyboardMouse.StageProgressAllow") && ok;

	InputBinding remap_binding;
	remap_binding.action = InputAction::MoveX;
	remap_binding.source_type = InputSourceType::KeyboardKey;
	remap_binding.source_code = 'I';
	remap_binding.scale = 1.f;

	ok = ExpectInputSelfTest(TryRemapAction(ControllerPreset::MouseOnly, InputAction::MoveX, remap_binding) == InputRemapResult::RejectedByPolicy,
		"TryRemap.MouseOnly.Rejected") && ok;
	ok = ExpectInputSelfTest(TryRemapAction(ControllerPreset::KeyboardMouse, InputAction::MoveX, remap_binding) == InputRemapResult::Success,
		"TryRemap.KeyboardMouse.MoveX.Success") && ok;

	InputBinding interact_remap_binding;
	interact_remap_binding.action = InputAction::Interact;
	interact_remap_binding.source_type = InputSourceType::KeyboardKey;
	interact_remap_binding.source_code = 'O';
	interact_remap_binding.scale = 1.f;
	ok = ExpectInputSelfTest(TryRemapAction(ControllerPreset::KeyboardMouse, InputAction::Interact, interact_remap_binding) == InputRemapResult::Success,
		"TryRemap.KeyboardMouse.Interact.Success") && ok;

	InputBinding stage_progress_binding;
	ok = ExpectInputSelfTest(TryGetPrimaryBinding(ControllerPreset::KeyboardA, InputAction::StageProgress, &stage_progress_binding)
		&& stage_progress_binding.source_type == InputSourceType::KeyboardKey
		&& stage_progress_binding.source_code == VK_SPACE,
		"Default.KeyboardA.StageProgress.Space") && ok;
	ok = ExpectInputSelfTest(TryGetPrimaryBinding(ControllerPreset::KeyboardB, InputAction::StageProgress, &stage_progress_binding)
		&& stage_progress_binding.source_type == InputSourceType::KeyboardKey
		&& stage_progress_binding.source_code == VK_SPACE,
		"Default.KeyboardB.StageProgress.Space") && ok;
	ok = ExpectInputSelfTest(TryGetPrimaryBinding(ControllerPreset::KeyboardMouse, InputAction::StageProgress, &stage_progress_binding)
		&& stage_progress_binding.source_type == InputSourceType::KeyboardKey
		&& stage_progress_binding.source_code == VK_SPACE,
		"Default.KeyboardMouse.StageProgress.Space") && ok;

	SetCurrentPreset(ControllerPreset::KeyboardMouse);
	BeginFrame();
	OnKeyDown('I', 0);
	SyncActionStates();
	ok = ExpectInputSelfTest(ActionDown(InputAction::MoveX), "TryRemap.KeyboardMouse.MoveX.Applied") && ok;

	// [케이스 4] 키 홀드 시간 / 트리거 / 릴리즈 홀드 확인
	ResetAll();
	SetCurrentPreset(ControllerPreset::KeyboardA);

	BeginFrame();
	OnKeyDown(VK_SPACE, 0);
	SyncActionStates(0.1f);
	ok = ExpectInputSelfTest(HoldFrames(VK_SPACE) == 1, "Hold.Key.Frame1") && ok;
	ok = ExpectInputSelfTest(HoldSeconds(VK_SPACE) >= 0.099f, "Hold.Key.Seconds1") && ok;
	ok = ExpectInputSelfTest(!HoldTriggered(VK_SPACE, 0.15f), "Hold.Key.TriggerBeforeThreshold") && ok;

	BeginFrame();
	SyncActionStates(0.1f);
	ok = ExpectInputSelfTest(HoldFrames(VK_SPACE) == 2, "Hold.Key.Frame2") && ok;
	ok = ExpectInputSelfTest(HoldSeconds(VK_SPACE) >= 0.199f, "Hold.Key.Seconds2") && ok;
	ok = ExpectInputSelfTest(HeldFor(VK_SPACE, 0.15f), "Hold.Key.HeldFor") && ok;
	ok = ExpectInputSelfTest(HoldTriggered(VK_SPACE, 0.15f), "Hold.Key.TriggerAtThreshold") && ok;

	BeginFrame();
	OnKeyUp(VK_SPACE, 0);
	SyncActionStates(0.016f);
	ok = ExpectInputSelfTest(ReleasedHoldSeconds(VK_SPACE) >= 0.199f, "Hold.Key.ReleasedHold") && ok;
	ok = ExpectInputSelfTest(HoldFrames(VK_SPACE) == 0, "Hold.Key.ResetAfterRelease") && ok;

	// [케이스 5] 액션 홀드 시간 / 트리거 / 릴리즈 홀드 확인
	ResetAll();
	SetCurrentPreset(ControllerPreset::KeyboardA);

	BeginFrame();
	OnKeyDown('Q', 0);
	SyncActionStates(0.12f);
	ok = ExpectInputSelfTest(ActionHoldFrames(InputAction::Skill1) == 1, "Hold.Action.Frame1") && ok;
	ok = ExpectInputSelfTest(ActionHoldSeconds(InputAction::Skill1) >= 0.119f, "Hold.Action.Seconds1") && ok;

	BeginFrame();
	SyncActionStates(0.12f);
	ok = ExpectInputSelfTest(ActionHeldFor(InputAction::Skill1, 0.2f), "Hold.Action.HeldFor") && ok;
	ok = ExpectInputSelfTest(ActionHoldTriggered(InputAction::Skill1, 0.2f), "Hold.Action.TriggerAtThreshold") && ok;

	BeginFrame();
	OnKeyUp('Q', 0);
	SyncActionStates(0.016f);
	ok = ExpectInputSelfTest(ActionReleasedHoldSeconds(InputAction::Skill1) >= 0.239f, "Hold.Action.ReleasedHold") && ok;
	ok = ExpectInputSelfTest(ActionHoldFrames(InputAction::Skill1) == 0, "Hold.Action.ResetAfterRelease") && ok;

	ResetAll();
	SetCurrentPreset(prev_preset);
	default_binding_table_ = prev_binding_table;
	action_states_dirty_ = true;
	ReportInputSelfTest(ok, "InputManager.RunSelfTest");
	return ok;
}
