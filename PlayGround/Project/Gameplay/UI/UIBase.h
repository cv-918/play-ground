#pragma once

class UIBase abstract
	: public IInitializable
	, public IUpdatable
	, public IReleasable
	, public IIdentifiable
{
public:
	explicit UIBase() DEFAULT;
	virtual ~UIBase() DEFAULT;

	_bool Initialize() override { MAKE_INITIALIZED; return true; }
	_int Update(_double _delta_time) override { return 0; }
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

	_bool IsDestroyed() const { return destroyed_; }
	void Destroy() { destroyed_ = true; }

	// UI 요소가 파괴될 때 필요한 로직이 있다면 이 함수를 오버라이드하여 구현
	// 예를 들어, 사운드 재생, 애니메이션 재생 등 다양한 효과를 이 함수에서 처리
	// 이벤트나 콜백을 추가해서 다른 시스템과 연동할 수 있도록 확장해도 좋음
	virtual void OnDestroy() EMPTY_FUNC;

protected:
	_Rect rect_; // UI의 위치와 크기를 나타내는 사각형

	UIBase* parent_ = nullptr; // 부모 UI 요소에 대한 포인터
	std::vector<UIBase*> children_; // 자식 UI 요소들을 저장하는 벡터

	_bool destroyed_ = false; // UI 요소가 파괴되었는지 여부를 나타내는 플래그. 필요에 따라 UI 요소의 생명 주기를 관리하는 데 활용할 수 있습니다.
};
