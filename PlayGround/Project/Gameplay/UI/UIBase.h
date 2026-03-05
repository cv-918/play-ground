#pragma once

class GameObjectBase;

class UIBase abstract
	: public IInitializable
	, public IUpdatable
	, public IReleasable
	, public IIdentifiable
{
public:
	_bool Initialize() override { MAKE_INITIALIZED; return true; }

	_int Update(_double _delta_time) override;
	void Render(_double _delta_time) override EMPTY_FUNC;

	_bool Release() override { return true; }

public:
	// 위치와 크기 설정
	void SetRect(const _Rect& _rect) { rect_ = _rect; }
	void SetPosition(const _Point& _position);
	void SetSize(const _Size& _size);

	// 부모-자식 관계 관리
	void SetParent(UIBase* _parent);
	void AddChild(UIBase* _child);

	// UI 요소의 절대 위치 계산 (부모 요소의 위치를 고려)
	_Point GetAbsolutePosition() const;
	_Rect GetAbsoluteRect() const;

	// 마우스 오버 여부 확인
	_bool IsMouseOver(const _Point& _mouse_pos) const;

	// 객체 생명 주기 관리
	_bool IsDestroyed() const { return destroyed_; }
	void Destroy() { destroyed_ = true; }

	virtual void OnDestroy() EMPTY_FUNC; // UI 요소가 파괴될 때 필요한 로직이 있다면 이 함수를 오버라이드하여 구현
										 // 예를 들어, 사운드 재생, 애니메이션 재생 등 다양한 효과를 이 함수에서 처리
										 // 이벤트나 콜백을 추가해서 다른 시스템과 연동할 수 있도록 확장해도 좋음

	// 오브젝트 트래킹 설정
	void SetTrackingTarget(GameObjectBase* _target, const _Vector3& _offset);

protected:
	// UI의 위치와 크기를 나타내는 사각형
	_Rect rect_;

	// UI 요소의 부모-자식 관계를 관리하기 위한 포인터와 벡터. 필요에 따라 UI 요소 간의 계층 구조를 구성하여 복잡한 UI 레이아웃을 구현할 수 있습니다.
	UIBase* parent_ = nullptr;
	std::vector<UIBase*> children_;

	// UI 요소가 파괴되었는지 여부를 나타내는 플래그. 필요에 따라 UI 요소의 생명 주기를 관리하는 데 활용할 수 있습니다.
	_bool destroyed_ = false;

	// 게임 오브젝트 트래킹을 위한 변수들
	GameObjectBase* tracked_object_ = nullptr; // 트래킹할 게임 오브젝트에 대한 포인터. 필요에 따라 UI 요소가 특정 게임 오브젝트의 위치를 따라가도록 구현할 때 사용할 수 있습니다.
	_Vector3 tracking_offset_ = _Vector3::Zero(); // 트래킹 오프셋. 필요에 따라 UI 요소가 트래킹하는 게임 오브젝트에 대해 위치 보정을 할 때 활용할 수 있습니다.
};
