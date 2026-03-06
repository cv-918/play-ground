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
	_bool Release() override { return true; }

public:
	// 위치와 크기 설정
	_Rect GetRect() const { return rect_; }
	void SetRect(const _Rect& _rect) { rect_ = _rect; }
	void SetRect(const _Point _position, const _Size& _size) { rect_ = _Rect(_position, _size); }

	_Point GetPosition() const { return rect_.GetLt(); }
	virtual void SetPosition(const _Point& _position) { rect_.MoveLtTo(_position); }

	_Point GetCenter() const { return rect_.GetCenter(); }
	virtual void SetCenter(const _Point& _center) { rect_.MoveCenterTo(_center); }

	_Size GetSize() const { return rect_.GetSize(); }
	virtual void SetSize(const _Size& _size) { rect_.ScaleFromLt(_size); }

	// 유틸 위치 이동 함수
	virtual void MoveX(const _int _dx) { rect_.MoveX(_dx); }
	virtual void MoveY(const _int _dy) { rect_.MoveY(_dy); }

	// 유틸 크기 조절 함수
	virtual void ScaleX(const _int _dWidth) { rect_.ScaleX(_dWidth); }
	virtual void ScaleY(const _int _dHeight) { rect_.ScaleY(_dHeight); }
	
	// 마우스 오버 여부 확인
	_bool IsMouseOver(const _Point& _mouse_pos) const { return rect_.PtInRect(_mouse_pos); }

	// 객체 생명 주기 관리
	_bool IsDestroyed() const { return destroyed_; }
	void Destroy() { destroyed_ = true; }

	virtual void OnDestroy() EMPTY_FUNC; // UI 요소가 파괴될 때 필요한 로직이 있다면 이 함수를 오버라이드하여 구현
										 // 예를 들어, 사운드 재생, 애니메이션 재생 등 다양한 효과를 이 함수에서 처리
										 // 이벤트나 콜백을 추가해서 다른 시스템과 연동할 수 있도록 확장해도 좋음

private:
	// UI의 위치와 크기를 나타내는 사각형
	_Rect rect_;

	// UI 요소가 파괴되었는지 여부를 나타내는 플래그. 필요에 따라 UI 요소의 생명 주기를 관리하는 데 활용할 수 있습니다.
	_bool destroyed_ = false;
};
