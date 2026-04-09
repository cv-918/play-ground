#pragma once

class GameObjectBase;

class UIBase abstract
	: public IInitializable
	, public IUpdatable
	, public IIdentifiable
	, public IDestroyable
{
protected:
	struct UICreateInfo
	{
		_Rect rect;
	};

public:
	_bool Initialize() override;
	void DebugRender() override;

public:
	// 위치와 크기 설정
	_Rect GetRect() const { return rect_; }
	void SetRect(const _Rect& _rect) { rect_ = _rect; }
	void SetRect(const _Point _position, const _Size& _size) { rect_ = _Rect{ _position, _size }; }

	_Point GetPosition() const { return rect_.Lt(); }
	virtual void SetPosition(const _Point& _position) { rect_.MoveLtTo(_position); }

	_Point GetCenter() const { return rect_.Center(); }
	virtual void SetCenter(const _Point& _center) { rect_.MoveCenterTo(_center); }

	_Size GetSize() const { return rect_.Size(); }
	virtual void SetSize(const _Size& _size) { rect_.ScaleFromLt(_size); }

	// 유틸 위치 이동 함수
	virtual void MoveX(const _int _dx) { rect_.MoveX(_dx); }
	virtual void MoveY(const _int _dy) { rect_.MoveY(_dy); }

	// 유틸 크기 조절 함수
	virtual void ScaleX(const _int _dWidth) { rect_.ScaleX(_dWidth); }
	virtual void ScaleY(const _int _dHeight) { rect_.ScaleY(_dHeight); }
	
	// 마우스 오버 여부 확인
	_bool IsMouseOver(const _Point& _mouse_pos) const { return rect_.PtInRect(_mouse_pos); }

private:
	// UI의 위치와 크기를 나타내는 사각형
	_Rect rect_;
};
