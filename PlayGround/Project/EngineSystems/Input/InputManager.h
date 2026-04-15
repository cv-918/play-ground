#pragma once

#define _InputMgr InputManager::Get()
#define INPUT_KEY_MAX 256

enum class ControllerPreset
{
	// 키보드 기본 프리셋 A
	KeyboardA,
	// 키보드 기본 프리셋 B
	KeyboardB,
	// 마우스만 사용하는 프리셋
	MouseOnly,
	// 키보드 + 마우스 혼합 프리셋
	KeyboardMouse,
	Count,
};

enum class InputAction
{
	// 수평 이동 축
	MoveX,
	// 수직 이동 축
	MoveY,
	// 대시
	Dash,
	// 스킬 1
	Skill1,
	// 스킬 2
	Skill2,
	// 상호작용
	Interact,
	// 일시정지
	Pause,
	// 스테이지 진행
	StageProgress,
	// 액션 개수
	Count,
};

enum class InputSourceType
{
	KeyboardKey,
	MouseButton,
	MouseAxis,
};

enum class InputRemapResult
{
	Success,
	InvalidAction,
	PresetNotFound,
	RejectedByPolicy,
};

struct InputBinding
{
	/** 어떤 액션에 연결되는지 */
	InputAction action = InputAction::MoveX;
	/** 어떤 입력 소스를 쓰는지 */
	InputSourceType source_type = InputSourceType::KeyboardKey;
	/** VK 코드/마우스 버튼/마우스 축 인덱스 */
	_int source_code = IV_ZERO;
	/** 축 반전/가중치용 스케일 */
	_float scale = 1.f;
};

struct PresetBindingSet
{
	/** 프리셋 식별자 */
	ControllerPreset preset = ControllerPreset::KeyboardA;
	/** 프리셋에 속한 바인딩 목록 */
	std::vector<InputBinding> bindings;
};

// 모든 프리셋의 기본 바인딩 테이블
using PresetDefaultBindingTable = std::array<PresetBindingSet, s_cast(_uint, ControllerPreset::Count)>;

struct ActionState
{
	/** 현재 눌림 유지 여부 */
	_bool is_down = false;
	/** 이번 프레임 눌림 에지 */
	_bool went_down = false;
	/** 이번 프레임 떼짐 에지 */
	_bool went_up = false;
	/** 축 액션 값(예: MoveX/MoveY) */
	_float value = 0.f;

	/** 현재 홀드 프레임 수 */
	_int hold_frames = 0;
	/** 이전 프레임 홀드 프레임 수 */
	_int prev_hold_frames = 0;
	/** 현재 홀드 시간(초) */
	_float hold_seconds = 0.f;
	/** 이전 프레임 홀드 시간(초) */
	_float prev_hold_seconds = 0.f;
	/** 이번 프레임에 릴리즈된 경우, 릴리즈 직전 홀드 시간(초) */
	_float released_hold_seconds = 0.f;
};

class InputManager : public ISingleton<InputManager>
{
public:
	/** 매 프레임 시작 시 1회 메시지 처리 전에 호출 */
	void BeginFrame();

	/**
	 * 이번 프레임에 누적된 raw 입력을 액션 상태로 1회 반영한다.
	 * _delta_time을 넘기면 홀드 시간(초)도 함께 누적된다.
	 */
	void SyncActionStates(_float _delta_time = 0.f);

	/** 포커스 잃었을 때(Alt+Tab 등) 키가 눌린 채로 고정되는 현상 방지용 */
	void ResetAll();

	/** WndProc에서 호출 */
	void OnMouseMove(WPARAM _wparam, LPARAM _lparam);
	void OnMouseWheel(WPARAM _wparam, LPARAM _lparam);

	/** MouseOnly 이동 계산 기준점(예: 플레이어 화면 좌표)을 갱신한다. */
	void SetMouseMoveReferencePoint(const _Point& _point);

	/** WndProc에서 호출 */
	void OnMouseButtonDown(WPARAM _vk, LPARAM _lparam);
	/** WndProc에서 호출 */
	void OnMouseButtonUp(WPARAM _vk, LPARAM _lparam);
	/** WndProc에서 호출 */
	void OnKeyDown(WPARAM _vk, LPARAM _lparam);
	/** WndProc에서 호출 */
	void OnKeyUp(WPARAM _vk, LPARAM _lparam);
	/** WM_CHAR 입력을 프레임 버퍼에 누적한다. */
	void OnChar(_tchar _ch);

	/** 이번 프레임 눌림 에지를 반환한다. */
	bool Down(_int _vk) const;
	/** 현재 눌림 유지 상태를 반환한다. */
	bool Pressed(_int _vk) const;
	/** 이번 프레임 떼짐 에지를 반환한다. */
	bool Up(_int _vk) const;

	/** 현재 키가 유지된 프레임 수를 반환한다. */
	_int HoldFrames(_int _vk) const;
	/** 현재 키가 유지된 시간을 초 단위로 반환한다. */
	_float HoldSeconds(_int _vk) const;
	/** 현재 키가 지정 시간 이상 유지 중인지 반환한다. */
	_bool HeldFor(_int _vk, _float _seconds) const;
	/**
	 * 홀드 시간이 이번 프레임에 임계값을 처음 넘겼는지 반환한다.
	 * 예: 0.5초 차지 이펙트를 1회만 발생시킬 때 사용.
	 */
	_bool HoldTriggered(_int _vk, _float _seconds) const;
	/**
	 * 이번 프레임에 키가 떼졌다면,
	 * 떼지기 직전까지 유지된 시간을 반환한다.
	 */
	_float ReleasedHoldSeconds(_int _vk) const;

	/** 현재 하나 이상의 키가 눌려 있는지 반환한다. */
	_bool AnyKeyPressed() const { return pressed_key_count_ > 0; }

	/** 현재 활성화된 프리셋을 변경한다. */
	void SetCurrentPreset(ControllerPreset _preset);
	/** 현재 활성화된 프리셋을 반환한다. */
	ControllerPreset GetCurrentPreset() const { return current_preset_; }

	/** 액션 눌림 에지를 반환한다. */
	bool ActionPressed(InputAction _action) const;
	/** 액션 유지 상태를 반환한다. */
	bool ActionDown(InputAction _action) const;
	/** 액션 떼짐 에지를 반환한다. */
	bool ActionReleased(InputAction _action) const;
	/** 액션 축 값을 반환한다. */
	_float ActionValue(InputAction _action) const;

	/** 액션이 유지된 프레임 수를 반환한다. */
	_int ActionHoldFrames(InputAction _action) const;
	/** 액션이 유지된 시간을 초 단위로 반환한다. */
	_float ActionHoldSeconds(InputAction _action) const;
	/** 액션이 지정 시간 이상 유지 중인지 반환한다. */
	_bool ActionHeldFor(InputAction _action, _float _seconds) const;
	/** 액션 홀드 시간이 이번 프레임에 임계값을 넘겼는지 반환한다. */
	_bool ActionHoldTriggered(InputAction _action, _float _seconds) const;
	/** 액션이 이번 프레임에 릴리즈되었다면, 릴리즈 직전 홀드 시간을 반환한다. */
	_float ActionReleasedHoldSeconds(InputAction _action) const;

	/** 개발 검증용 입력 시스템 스모크 테스트 */
	_bool RunSelfTest();

	/** 프리셋/액션 remap 가능 정책 조회 */
	bool IsActionRemappable(ControllerPreset _preset, InputAction _action) const;
	/** 대상 액션의 바인딩을 새 바인딩 1개로 교체한다. */
	InputRemapResult TryRemapAction(ControllerPreset _preset, InputAction _action, const InputBinding& _new_binding);
	/** 특정 바인딩 하나를 새 바인딩으로 교체한다. */
	InputRemapResult TryRemapBinding(ControllerPreset _preset, const InputBinding& _target_binding, const InputBinding& _new_binding);
	/** 대상 액션의 대표 바인딩 1개를 반환한다. */
	bool TryGetPrimaryBinding(ControllerPreset _preset, InputAction _action, InputBinding* _out_binding) const;
	/** 특정 액션을 제외하고 바인딩 충돌 여부를 확인한다. */
	bool HasBindingConflict(ControllerPreset _preset, const InputBinding& _candidate, InputAction _ignore_action = InputAction::Count) const;
	/** 특정 바인딩 하나를 제외하고 바인딩 충돌 여부를 확인한다. */
	bool HasBindingConflictExcept(ControllerPreset _preset, const InputBinding& _candidate, const InputBinding& _ignore_binding) const;

	/** 프리셋의 바인딩 집합을 반환한다. */
	const PresetBindingSet* GetBindingSet(ControllerPreset _preset) const { return FindPresetBindingSet(_preset); }

	/** 현재 마우스 좌표(윈도우 기준)를 반환한다. */
	_Point MousePoint() const { return mouse_; }
	/** 현재 마우스 좌표를 디자인 해상도 기준으로 변환해 반환한다. */
	_Point MousePointDesign() const;
	/** 이번 프레임 누적 마우스 델타를 반환한다. */
	_Point MouseDelta() const { return mouse_delta_; }
	/** 이번 프레임 휠 델타를 반환한다. */
	_int MouseWheelDelta() const { return wheel_delta_; }

	/** 이번 프레임에 들어온 WM_CHAR 문자 목록을 반환한다. */
	const std::vector<_tchar>& Chars() const { return chars_; }

private:
	struct KeyState
	{
		/** 현재 눌림 상태(물리 상태) */
		_bool is_down = false;
		/** 이번 프레임 눌림 에지 */
		_bool went_down = false;
		/** 이번 프레임 떼짐 에지 */
		_bool went_up = false;

		/** 현재 홀드 프레임 수 */
		_int hold_frames = 0;
		/** 이전 프레임 홀드 프레임 수 */
		_int prev_hold_frames = 0;
		/** 현재 홀드 시간(초) */
		_float hold_seconds = 0.f;
		/** 이전 프레임 홀드 시간(초) */
		_float prev_hold_seconds = 0.f;
		/** 이번 프레임에 릴리즈된 경우, 릴리즈 직전 홀드 시간(초) */
		_float released_hold_seconds = 0.f;
	};

	/** raw 키 상태 테이블 */
	std::array<KeyState, INPUT_KEY_MAX> keys_;
	/** 이번 프레임에 들어온 문자 입력 버퍼 */
	std::vector<_tchar> chars_;
	/** 현재 프레임 액션 상태 테이블 */
	std::array<ActionState, s_cast(_uint, InputAction::Count)> action_states_;

	/** 현재 활성 프리셋 */
	ControllerPreset current_preset_ = ControllerPreset::KeyboardA;
	/** 프리셋별 기본 바인딩 테이블 */
	PresetDefaultBindingTable default_binding_table_ = CreateDefaultPresetBindingTable();

	/** 현재 눌려 있는 키 수 */
	_int pressed_key_count_ = IV_ZERO;

	/** 현재 마우스 좌표(윈도우 기준) */
	_Point mouse_ = _Point::Zero();
	/** 이전 프레임 마우스 좌표 */
	_Point prev_mouse_ = _Point::Zero();
	/** 이번 프레임 누적 마우스 델타 */
	_Point mouse_delta_ = _Point::Zero();
	/** MouseOnly 이동 계산 기준점 */
	_Point mouse_move_reference_point_ = _Point::Zero();
	/** MouseOnly 이동 계산 기준점 유효 여부 */
	_bool has_mouse_move_reference_point_ = false;

	/** 이번 프레임 휠 델타 */
	_int wheel_delta_ = IV_ZERO;
	/** 액션 상태 재계산 필요 여부 */
	_bool action_states_dirty_ = true;

	/** raw 상태를 현재 프리셋 기준 액션 상태로 변환한다. */
	void RebuildActionStates();

	/** 눌림 상태를 기준으로 키 홀드 시간/프레임을 갱신한다. */
	void UpdateKeyHoldStates(_float _delta_time);
	/** 액션 상태를 기준으로 액션 홀드 시간/프레임을 갱신한다. */
	void UpdateActionHoldStates(_float _delta_time);

	/** 프리셋별 바인딩 집합을 찾는다. */
	const PresetBindingSet* FindPresetBindingSet(ControllerPreset _preset) const;
	/** 프리셋별 바인딩 집합을 찾는다. */
	PresetBindingSet* FindPresetBindingSet(ControllerPreset _preset);

	/** 프리셋별 기본 키맵을 생성한다. */
	static PresetDefaultBindingTable CreateDefaultPresetBindingTable();
};