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

	virtual _bool Initialize() override { MAKE_INITIALIZED; return true; }
	virtual _int Update(_double _delta_time) override { return 0; }
	virtual void Render(_double _delta_time) override EMPTY_FUNC;
	virtual _bool Release() override { return true; }

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

public:
	_Rect rect_; // UI의 위치와 크기를 나타내는 사각형

	UIBase* parent_ = nullptr; // 부모 UI 요소에 대한 포인터
	std::vector<UIBase*> children_; // 자식 UI 요소들을 저장하는 벡터
};
