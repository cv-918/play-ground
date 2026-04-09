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
	// 어떤 액션에 연결되는지
	InputAction action = InputAction::MoveX;
	// 어떤 입력 소스를 쓰는지
	InputSourceType source_type = InputSourceType::KeyboardKey;
	// VK 코드/마우스 버튼/마우스 축 인덱스
	_int source_code = IV_ZERO;
	// 축 반전/가중치용 스케일
	_float scale = 1.f;
};

struct PresetBindingSet
{
	// 프리셋 식별자
	ControllerPreset preset = ControllerPreset::KeyboardA;
	// 프리셋에 속한 바인딩 목록
	std::vector<InputBinding> bindings;
};

// 모든 프리셋의 기본 바인딩 테이블
using PresetDefaultBindingTable = std::array<PresetBindingSet, s_cast(_uint, ControllerPreset::Count)>;

struct ActionState
{
	// 현재 눌림 유지 여부
	_bool is_down = false;
	// 이번 프레임 눌림 에지
	_bool went_down = false;
	// 이번 프레임 떼짐 에지
	_bool went_up = false;
	// 축 액션 값(예: MoveX/MoveY)
	_float value = 0.f;
};



class InputManager : public ISingleton<InputManager>
{
public:
	/* 매 프레임 시작 시 1회 메시지 처리 전에 호출 */
	void BeginFrame();
	/* 이번 프레임에 누적된 raw 입력을 액션 상태로 1회 반영 */
	void SyncActionStates();

	// 포커스 잃었을 때(Alt+Tab 등) 키가 눌린 채로 고정되는 현상 방지용
	void ResetAll();

	/* WndProc에서 호출 */
	void OnMouseMove(WPARAM _wparam, LPARAM _lparam);
	void OnMouseWheel(WPARAM _wparam, LPARAM _lparam);

	void OnMouseButtonDown(WPARAM _vk, LPARAM _lparam);
	void OnMouseButtonUp(WPARAM _vk, LPARAM _lparam);

	void OnKeyDown(WPARAM _vk, LPARAM _lparam);
	void OnKeyUp(WPARAM _vk, LPARAM _lparam);

	void OnChar(_tchar _ch);

	/* 입력 상태 조회 */
	bool Down(_int _vk) const;
	bool Pressed(_int _vk) const;
	bool Up(_int _vk) const;

	_bool AnyKeyPressed() const { return pressed_key_count_ > 0; }

	// 현재 활성화된 프리셋을 변경한다.
	void SetCurrentPreset(ControllerPreset _preset);
	ControllerPreset GetCurrentPreset() const { return current_preset_; }

	// 액션 상태 조회 API(게임 로직은 키 코드 대신 액션으로 조회)
	bool ActionPressed(InputAction _action) const;
	bool ActionDown(InputAction _action) const;
	bool ActionReleased(InputAction _action) const;
	_float ActionValue(InputAction _action) const;

	// 개발 검증용 입력 시스템 스모크 테스트
	_bool RunSelfTest();

	// 6단계: 프리셋/액션 remap 가능 정책 조회 및 remap 시도 API
	bool IsActionRemappable(ControllerPreset _preset, InputAction _action) const;
	InputRemapResult TryRemapAction(ControllerPreset _preset, InputAction _action, const InputBinding& _new_binding);

	_Point MousePoint() const { return mouse_; }
	_Point MousePointDesign() const;
	_Point MouseDelta() const { return mouse_delta_; }
	_int WheelDelta() const { return wheel_delta_; } // ±120 단위가 일반적

	const std::vector<_tchar>& Chars() const { return chars_; } // 이번 프레임에 들어온 WM_CHAR 문자 목록

private:
	struct KeyState
	{
		_bool is_down = false;    // 현재 눌림 상태(물리 상태)
		_bool went_down = false;  // 이번 프레임에 눌림(에지)
		_bool went_up = false;    // 이번 프레임에 뗌(에지)
	};

	std::array<KeyState, INPUT_KEY_MAX> keys_;
	std::vector<_tchar> chars_;
	std::array<ActionState, s_cast(_uint, InputAction::Count)> action_states_;

	// 현재 활성 프리셋 및 기본 바인딩 테이블
	ControllerPreset current_preset_ = ControllerPreset::KeyboardA;
	PresetDefaultBindingTable default_binding_table_ = CreateDefaultPresetBindingTable();

	_int pressed_key_count_ = IV_ZERO;

	_Point mouse_ = _Point::Zero();
	_Point prev_mouse_ = _Point::Zero();
	_Point mouse_delta_ = _Point::Zero();

	_int wheel_delta_ = IV_ZERO;
	_bool action_states_dirty_ = true;

	// raw 상태를 현재 프리셋 기준 액션 상태로 변환한다.
	void RebuildActionStates();
	const PresetBindingSet* FindPresetBindingSet(ControllerPreset _preset) const;
	PresetBindingSet* FindPresetBindingSet(ControllerPreset _preset);

	// 4단계에서 프리셋별 기본 키맵을 채운다.
	static PresetDefaultBindingTable CreateDefaultPresetBindingTable();
};
