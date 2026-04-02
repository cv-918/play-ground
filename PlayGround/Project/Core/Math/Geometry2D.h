#pragma once

// 상호 참조를 위한 전방 선언
struct _Vector2;
struct _Vector3;

struct _Point
{
	_int x = 0;
	_int y = 0;

public:
	constexpr _Point() : x(0), y(0) {}
	constexpr _Point(_int _x, _int _y) : x(_x), y(_y) {}
	constexpr _Point(_float _x, _float _y)
		: x(s_int(_x + (_x >= 0 ? 0.5f : -0.5f)))
		, y(s_int(_y + (_y >= 0 ? 0.5f : -0.5f))) {}

	// 벡터와의 호환성 (구현은 cpp에서)
	_Point(const _Vector2& _vec);
	_Point(const _Vector3& _vec);

	static constexpr _Point Zero() { return { 0, 0 }; }

	// 연산자 오버로드 (벡터와의 연산 포함)
	_Point operator+(const _Point& _pt) const { return { x + _pt.x, y + _pt.y }; }
	_Point operator-(const _Point& _pt) const { return { x - _pt.x, y - _pt.y }; }
	_Point operator*(const _int _s) const { return { x * _s, y * _s }; }
	_Point operator/(const _int _s) const {
		if (_s == 0) return Zero();
		return { x / _s, y / _s };
	}

	_Point& operator+=(const _Point& _pt) { x += _pt.x; y += _pt.y; return *this; }
	_Point& operator-=(const _Point& _pt) { x -= _pt.x; y -= _pt.y; return *this; }
	_Point& operator*=(const _int _s) { x *= _s; y *= _s; return *this; }
	_Point& operator/=(const _int _s) {
		if (_s == 0) { x = 0; y = 0; }
		else { x /= _s; y /= _s; }
		return *this;
	}

	// 벡터 변환 편의 기능
	_Vector2 ToVector2() const;
};

struct _Size
{
	_int x = 0; // width
	_int y = 0; // height

public:
	constexpr _Size() : x(0), y(0) {}
	constexpr _Size(_int _w, _int _h) : x(_w), y(_h) {}
	constexpr _Size(_float _w, _float _h)
		: x(s_int(_w + (_w >= 0 ? 0.5f : -0.5f)))
		, y(s_int(_h + (_h >= 0 ? 0.5f : -0.5f))) {}

	// 벡터로부터 크기 생성 (폭과 높이로 변환)
	_Size(const _Vector2& _vec);

	static constexpr _Size Zero() { return { 0, 0 }; }

	// 연산자 오버로드
	_Size operator+(const _Size& _rhs) const { return { x + _rhs.x, y + _rhs.y }; }
	_Size operator-(const _Size& _rhs) const { return { x - _rhs.x, y - _rhs.y }; }
	_Size operator*(const _float _s) const { return { s_int(std::round(x * _s)), s_int(std::round(y * _s)) }; }
	_Size operator/(const _float _s) const {
		if (std::fabs(_s) < 1e-5f) return Zero();
		return { s_int(std::round(x / _s)), s_int(std::round(y / _s)) };
	}

	_Size& operator+=(const _Size& _rhs) { x += _rhs.x; y += _rhs.y; return *this; }
	_Size& operator-=(const _Size& _rhs) { x -= _rhs.x; y -= _rhs.y; return *this; }
	_Size& operator*=(const _float _s) { *this = *this * _s; return *this; }
	_Size& operator/=(const _float _s) { *this = *this / _s; return *this; }

	_bool operator==(const _Size& _rhs) const { return x == _rhs.x && y == _rhs.y; }
	_bool operator!=(const _Size& _rhs) const { return !(*this == _rhs); }
};

struct _Rect
{
private:
	_Point points_[2]; // 0: LT, 1: RB

public:
	constexpr _Rect() : points_{ {}, {} } {}
	constexpr _Rect(_Point _lt, _Point _rb) : points_{ _lt, _rb } {}
	constexpr _Rect(_Point _lt, _Size _size) : points_{ _lt, {_lt.x + _size.x, _lt.y + _size.y} } {}
	constexpr _Rect(_int _left, _int _top, _int _right, _int _bottom) : points_{ { _left, _top }, { _right, _bottom } } {}

	// LT와 너비, 높이를 이용해 생성하는 편의 기능
	static _Rect FromLtSize(_Point _lt, _Size _size) {
		return { _lt, _Size{ _lt.x + _size.x, _lt.y + _size.y } };
	}

	// 중심점과 반지름(반너비/반높이)으로 생성하는 편의 기능
	static _Rect FromCenter(_Point _center, _int _halfW, _int _halfH) {
		return { _Point{_center.x - _halfW, _center.y - _halfH}, _Point{_center.x + _halfW, _center.y + _halfH} };
	}

	// 기본 정보 Get (실수형 반환 포함)
	_Point Lt() const { return points_[0]; }
	_Point Rb() const { return points_[1]; }
	_Point Center() const { return { (points_[0].x + points_[1].x) / 2, (points_[0].y + points_[1].y) / 2 }; }
	_Size  Size()   const { return { points_[1].x - points_[0].x, points_[1].y - points_[0].y }; }

	_int Left() const { return points_[0].x; }
	_int Top() const { return points_[0].y; }
	_int Right() const { return points_[1].x; }
	_int Bottom() const { return points_[1].y; }

	_float Left_f() const { return s_float(points_[0].x); }
	_float Top_f() const { return s_float(points_[0].y); }
	_float Right_f() const { return s_float(points_[1].x); }
	_float Bottom_f() const { return s_float(points_[1].y); }

	_int Width() const { return points_[1].x - points_[0].x; }
	_int Height() const { return points_[1].y - points_[0].y; }
	

	// 충돌 체크 (벡터 호환)
	_bool PtInRect(const _Point& _pt) const;
	_bool PtInRect(const _Vector2& _vec) const;

	// 조작 함수
	void MoveLtTo(const _Point& _lt);
	void MoveCenterTo(const _Point& _newCenter);
	void MoveX(_int _dx) { MoveLtTo({ Left() + _dx, Top() }); }
	void MoveY(_int _dy) { MoveLtTo({ Left(), Top() + _dy }); }

	void ScaleFromLt(const _Size& _newSize); // 좌상단 기준 크기 조절
	void ScaleFromCenter(_float _scale); // 중심 기준 크기 조절
	void ScaleX(_int _dw) { ScaleFromLt({ Width() + _dw, Height() }); }
	void ScaleY(_int _dh) { ScaleFromLt({ Width(), Height() + _dh }); }

	// 연산자 오버로드
	_Rect operator+(const _Rect& _rhs) const { return { Lt() + _rhs.Lt(), Rb() + _rhs.Rb() }; }
	_Rect operator-(const _Rect& _rhs) const { return { Lt() - _rhs.Lt(), Rb() - _rhs.Rb() }; }
	_Rect operator*(const _int _s) const { return { Lt() * _s, Rb() * _s }; }
	_Rect operator/(const _int _s) const {
		if (_s == 0) return {};
		return { Lt() / _s, Rb() / _s };
	}

	_Rect& operator+=(const _Rect& _rhs) { *this = *this + _rhs; return *this; }
	_Rect& operator-=(const _Rect& _rhs) { *this = *this - _rhs; return *this; }
	_Rect& operator*=(const _int _s) { *this = *this * _s; return *this; }
	_Rect& operator/=(const _int _s) { *this = *this / _s; return *this; }
};

struct _RectF
{
	_RectF() DEFAULT;
	_RectF(_float _left, _float _top, _float _right, _float _bottom)
		: left(_left), top(_top), right(_right), bottom(_bottom) {}
	_RectF(const _Rect& _rect)
		: left(_rect.Left_f()), top(_rect.Top_f()), right(_rect.Right_f()), bottom(_rect.Bottom_f()) {}

	_Point Lt() const { return { left, top }; }
	_Point Rb() const { return { right, bottom }; }

	_float Left() const { return left; }
	_float Top() const { return top; }
	_float Right() const { return right; }
	_float Bottom() const { return bottom; }

	_float Width() const { return right - left; }
	_float Height() const { return bottom - top; }
	_Size Size() const { return _Size(Width(), Height()); }

	_Rect ToRect() const
	{
		return {
			s_int(std::round(left)),
			s_int(std::round(top)),
			s_int(std::round(right)),
			s_int(std::round(bottom)) };
	}

	_float left = 0.f;
	_float top = 0.f;
	_float right = 0.f;
	_float bottom = 0.f;
};