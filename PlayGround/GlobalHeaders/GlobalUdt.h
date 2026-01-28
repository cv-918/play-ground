#pragma once

// 기본 자료형
typedef bool						_bool;

typedef unsigned char				_ubyte;
typedef signed char					_byte;
typedef wchar_t						_tchar;

typedef unsigned short				_ushort;
typedef signed short				_short;

typedef unsigned int				_uint;
typedef signed int					_int;

typedef unsigned long				_ulong;
typedef signed long					_long;

typedef float						_float;
typedef double						_double;

// 클래스
template <typename T>
class SingletonBase
{
public:
	explicit SingletonBase() DEFAULT;
	virtual ~SingletonBase() DEFAULT;

	static T& Get()
	{
		static T instance;
		return instance;
	}
};

class IInitializable
{
public:
	explicit IInitializable() DEFAULT;
	virtual ~IInitializable() DEFAULT;

	virtual _bool Initialize() PURE;
};

class IUpdatable abstract
{
public:
	explicit IUpdatable() DEFAULT;
	virtual ~IUpdatable() DEFAULT;

	virtual _int Update(double _delta_time) PURE;
	virtual _int Render(double _delta_time) PURE;

public:
	_bool Active() const { return is_active; }
	void Active(const _bool _active) { is_active = _active; }

	_bool Visible() const { return is_visible; }
	void Visible(const _bool _visible) { is_visible = _visible; }

private:
	_bool is_active		= true;
	_bool is_visible	= true;
};

class IIdentifiable abstract
{
public:
	explicit IIdentifiable() DEFAULT;
	virtual ~IIdentifiable() DEFAULT;

public:
	_int ID() const { return id_; }
	void ID(const _int _id) { id_ = _id; }

	std::string Name() const { return name_; }
	void Name(const std::string _name) { name_ = _name; }

protected:
	_int id_ = IV_INVALID;
	std::string name_;
};

class GameObjectBase abstract : public IInitializable, IUpdatable, IIdentifiable
{
public:
	explicit GameObjectBase() DEFAULT;
	virtual ~GameObjectBase() DEFAULT;
};

class ComponentBase abstract : public IInitializable, IUpdatable, IIdentifiable
{
public:
	explicit ComponentBase() DEFAULT;
	virtual ~ComponentBase() DEFAULT;

public:
	ComponentType Type() const { return type_; }
	
	class GameObject* GameObject() const { return gameobject_; }
	void GameObject(class GameObject* _object) { gameobject_ = _object; }
	
private:
	ComponentType type_ = ComponentType::Undefined;

	class GameObject* gameobject_ = nullptr;
};

// 구조체
struct Vector3
{
public:
	// 생성자
	constexpr Vector3() : x(IV_ZERO), y(IV_ZERO), z(IV_ZERO) {}
	constexpr Vector3(_float _x, _float _y, _float _z) : x(_x), y(_y), z(_z) {}
	constexpr Vector3(_float _x, _float _y) : x(_x), y(_y), z(IV_ZERO) {}

	// 영벡터
	static constexpr Vector3 Zero() { return Vector3{}; }

	// 길이
	_float LengthSq() const { return x * x + y * y + z * z; }
	_float Length() const { return static_cast<_float>(std::sqrt(LengthSq())); }

	// 정규화(길이가 0이면 영벡터 반환)
	Vector3 Normalized() const
	{
		const _float len = Length();
		if (len <= 0.0f)
			return Vector3::Zero();

		return (*this) / len;
	}

	// 제자리 정규화(길이가 0이면 변화 없음)
	void Normalize()
	{
		const _float len = Length();
		if (len <= 0.0f)
			return;

		x /= len;
		y /= len;
		z /= len;
	}

	// 내적
	static _float Dot(const Vector3& _a, const Vector3& _b) { return _a.x * _b.x + _a.y * _b.y + _a.z * _b.z; }

	// 외적(3D용, 2D에서는 거의 안 씀)
	static Vector3 Cross(const Vector3& _a, const Vector3& _b)
	{
		return Vector3(
			_a.y * _b.z - _a.z * _b.y,
			_a.z * _b.x - _a.x * _b.z,
			_a.x * _b.y - _a.y * _b.x
		);
	}

	// 거리
	static _float Distance(const Vector3& _a, const Vector3& _b) { return (_a - _b).Length(); }

	// 선형 보간
	static Vector3 Lerp(const Vector3& _a, const Vector3& _b, _float _t) { return _a + (_b - _a) * _t; }

	// 근사 비교(부동소수점용)
	bool NearEquals(const Vector3& _rhs, _float _epsilon = 1e-5f) const
	{
		return (std::fabs(x - _rhs.x) <= _epsilon) &&
			(std::fabs(y - _rhs.y) <= _epsilon) &&
			(std::fabs(z - _rhs.z) <= _epsilon);
	}

	// 연산자 오버로드
	Vector3 operator+(const Vector3& _rhs) const { return Vector3(x + _rhs.x, y + _rhs.y, z + _rhs.z); }
	Vector3 operator-(const Vector3& _rhs) const { return Vector3(x - _rhs.x, y - _rhs.y, z - _rhs.z); }
	Vector3 operator*(const _float _s) const { return Vector3(x * _s, y * _s, z * _s); }
	Vector3 operator/(const _float _s) const
	{
		// 0 나눗셈 방지(샌드박스라 assert로 바꿔도 됨)
		if (_s == 0.0f)
			return Vector3::Zero();
		return Vector3(x / _s, y / _s, z / _s);
	}

	Vector3& operator+=(const Vector3& _rhs) { x += _rhs.x; y += _rhs.y; z += _rhs.z; return *this; }
	Vector3& operator-=(const Vector3& _rhs) { x -= _rhs.x; y -= _rhs.y; z -= _rhs.z; return *this; }
	Vector3& operator*=(const _float _s) { x *= _s; y *= _s; z *= _s; return *this; }
	Vector3& operator/=(const _float _s)
	{
		if (_s == 0.0f)
		{
			x = y = z = 0.0f;
			return *this;
		}
		x /= _s; y /= _s; z /= _s;
		return *this;
	}

	bool operator==(const Vector3& _rhs) const { return x == _rhs.x && y == _rhs.y && z == _rhs.z; }
	bool operator!=(const Vector3& _rhs) const { return !(*this == _rhs); }

public:
	_float x = IV_ZERO;
	_float y = IV_ZERO;
	_float z = IV_ZERO;
};

// 스칼라 * 벡터
inline Vector3 operator*(const _float _s, const Vector3& _v)
{
	return _v * _s;
}