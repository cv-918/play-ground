#pragma once

#include "Core/Math/Vector2.h"

#include <cstdint>
#include <vector>

class Enemy;
class GameObjectBase;
class Movement;
class Transform;

class EnemySeparationSystem final
{
public:
	void Resolve(const std::vector<GameObjectBase*>& _game_objects, _double _delta_time);

private:
	using CellKey = std::uint64_t;

	struct Proxy
	{
		Enemy* enemy_ = nullptr;
		Transform* transform_ = nullptr;
		Movement* movement_ = nullptr;
		_Vector2 center_ = _Vector2::Zero();
		_Vector2 center_offset_ = _Vector2::Zero();
		_Vector2 displacement_ = _Vector2::Zero();
		_float radius_x_ = 0.f;
		_float radius_y_ = 0.f;
		_float search_radius_ = 0.f;
		_float move_weight_ = 1.f;
		_int object_id_ = 0;
	};

	struct CellEntry
	{
		CellKey key_ = 0;
		_int proxy_index_ = 0;
	};

	struct CellRange
	{
		CellKey key_ = 0;
		_int begin_ = 0;
		_int end_ = 0;
	};

private:
	void _CollectProxies(const std::vector<GameObjectBase*>& _game_objects);
	void _BuildGrid();
	void _ResolvePairs();
	_bool _ApplyDisplacements(_double _delta_time);

	const CellRange* _FindCellRange(CellKey _key) const;
	CellKey _MakeCellKey(_int _x, _int _y) const;
	_int _ToCell(_float _value) const;
	_bool _TryGetProxy(GameObjectBase* _game_object, Proxy& _out_proxy) const;
	_bool _TryComputeSeparation(const Proxy& _left, const Proxy& _right, _Vector2& _out_correction) const;

private:
	std::vector<Proxy> proxies_;
	std::vector<CellEntry> cell_entries_;
	std::vector<CellRange> cell_ranges_;
	_float max_search_radius_ = 0.f;
};
