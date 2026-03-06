#pragma once

struct _Vector3;
struct _Point
{
	constexpr _Point() : x(IV_ZERO), y(IV_ZERO) {}
	constexpr _Point(const _int _value) : x(_value), y(_value) {}
	constexpr _Point(const _int _x, const _int _y) : x(_x), y(_y) {}

	// 벡터에서 포인트로 변환하는 생성자
	_Point(const _Vector3& _vec);
	// constexpr 함수는 컴파일 타임에 계산되어야 한다
	// 하지만 _Vector3는 상호 참조를 피하기 위해서 _Vector3는 전방 선언으로 처리되어 있다
	// 따라서 _Vector3의 멤버에 접근할 수 없어서 이 생성자는 constexpr로 선언할 수 없다

	static constexpr _Point Zero() { return _Point{}; }

	// 연산자 오버로드
	_Point operator+(const _Point& _pt) const;
	_Point operator+(const _Vector3& _vec) const;
	_Point operator-(const _Point& _pt) const;
	_Point operator-(const _Vector3& _vec) const;
	_Point& operator+=(const _Vector3& _vec);
	_Point& operator-=(const _Vector3& _vec);

	_int x;
	_int y;
};

struct _Size
{
	constexpr _Size() : x(IV_ZERO), y(IV_ZERO) {}
	constexpr _Size(const _int _value) : x(_value), y(_value) {}
	constexpr _Size(const _int _x, const _int _y) : x(_x), y(_y) {}

	static constexpr _Size Zero() { return _Size{}; }

	_int x;
	_int y;
};

struct _Rect
{
	constexpr _Rect() : points_{ _Point::Zero(), _Point::Zero() } {}
	constexpr _Rect(const _Point& _lt, const _Point& _rb) : points_{ _lt, _rb } {}
	constexpr _Rect(const _Point& _lt, const _Size& _size) : points_{ _lt, _Point{ _lt.x + _size.x, _lt.y + _size.y } } {}
	constexpr _Rect(const _int _left, const _int _top, const _int _right, const _int _bottom) : points_{ _Point(_left, _top), _Point(_right, _bottom) } {}

	static constexpr _Rect Zero() { return _Rect{}; }

	_Point GetLt() const { return points_[0]; }
	_Point GetRt() const { return { points_[1].x, points_[0].y }; }
	_Point GetRb() const { return points_[1]; }
	_Point GetLb() const { return { points_[0].x, points_[1].y }; }

	_Point GetCenter() const { return { (points_[0].x + points_[1].x) / 2, (points_[0].y + points_[1].y) / 2 }; }
	
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

	_Size GetSize() const { return { points_[1].x - points_[0].x, points_[1].y - points_[0].y }; }

	// 위치 이동 함수들
	void MoveLtTo(const _Point& _lt);
	void MoveCenterTo(const _Point& _center);

	void MoveX(const _int _dx) { MoveLtTo({ Left() + _dx, Top() }); }
	void MoveY(const _int _dy) { MoveLtTo({ Left(), Top() + _dy }); }

	// 크기 조절 함수들
	void ScaleFromLt(const _Size& _new_size);
	void ScaleFromCenter(const _Size& _new_size);

	void ScaleX(const _int _dWidth) { ScaleFromLt({ Width() + _dWidth, Height() }); }
	void ScaleY(const _int _dHeight) { ScaleFromLt({ Width(), Height() + _dHeight }); }

	// 점이 사각형 안에 있는지 확인하는 함수들
	_bool PtInRect(const _Point& _pt) const;
	_bool PtInRect(const _Vector3& _vec) const;

public:
	_Rect& operator*=(const _float _scale);
	_Rect operator*(const _float _scale) const;

private:
	_Point points_[2]; // lt, rb
};