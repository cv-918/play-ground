#pragma once

#include "Actors/Unit.h"

enum class KeyBoardControlType
{
	Direction,
	Axis,
};

// 아니면 둘 다 합쳐서 그냥 컨트롤 타입으로 묶고 그 안에서 제한적으로 제공
// 이게 사실 정석인 것 같긴 하다

class InputManager;

class Player : public Unit
{
private:
	virtual _bool Initialize() override;
	virtual _int Update(_double _delta_time) override;
	virtual _int Render(_double _delta_time) override;

private:
	_int _ControllRoutine(_double _delta_time);
	void _ControlInfoOnDebug();
	void _ShowDebugInfo();

public:
	void SetBackgroundRect(const _Rect& _rect) { background_rect_ = _rect; }

public:
	void SetControllerType(const KeyBoardControlType _type) { controller_type_ = _type; }
	
private:
	KeyBoardControlType controller_type_ = KeyBoardControlType::Axis;
	const InputManager* input_manager_ = nullptr; // 매 프레임 Get 호출 방지용 InputManager 캐싱

	// s, 가속도 방식 적용
	_Vector3 move_velocity_;
	_float acceleration_ = 1500.f; // 가속도 (픽셀/초^2)
	_float friction_ = 2.0f;        // 마찰 계수 (높을수록 빨리 멈춤)
	// e, 가속도 방식 적용

	// 디버그
	enum DrawDebugInfoType
	{
		None,
		MouseInfo,
		ControlInfo,
		TypeCount,
	};

	DrawDebugInfoType debug_type_ = DrawDebugInfoType::None;

	// 네비게이션용 배경 영역
	_Rect background_rect_ = {};
};

