#include "framework.h"
#include "EnemySeparationSystem.h"

#include "Actors/GameObjectBase.h"
#include "Actors/Stage/Enemy.h"
#include "Actors/Stage/EnemyTypes.h"
#include "Actors/Stage/UnitBase.h"
#include "Components/EllipseCollider.h"
#include "Components/Movement.h"
#include "Components/Status.h"
#include "Components/Transform.h"

namespace
{
	constexpr _float ENEMY_SEPARATION_CELL_SIZE = 96.f;
	constexpr _int ENEMY_SEPARATION_SOLVER_ITERATIONS = 2;
	constexpr _float ENEMY_SEPARATION_STRENGTH = 0.75f;
	constexpr _float ENEMY_SEPARATION_MAX_DISPLACEMENT_PER_ITERATION = 12.f;
	constexpr _float ENEMY_SEPARATION_DASH_MOVE_WEIGHT = 0.25f;
	constexpr _float ENEMY_SEPARATION_MIN_RADIUS = 2.f;
	constexpr _float ENEMY_SEPARATION_MIN_Y_RATIO = 0.1f;
	constexpr _float ENEMY_SEPARATION_EPSILON = 0.0001f;
	constexpr _float ENEMY_SEPARATION_TWO_PI = 6.28318530718f;
}

void EnemySeparationSystem::Resolve(const std::vector<GameObjectBase*>& _game_objects, _double _delta_time)
{
	_CollectProxies(_game_objects);
	if (proxies_.size() < 2)
		return;

	for (_int iteration = 0; iteration < ENEMY_SEPARATION_SOLVER_ITERATIONS; ++iteration)
	{
		for (auto& proxy : proxies_)
			proxy.displacement_ = _Vector2::Zero();

		_BuildGrid();
		_ResolvePairs();

		if (!_ApplyDisplacements(_delta_time))
			break;
	}
}

void EnemySeparationSystem::_CollectProxies(const std::vector<GameObjectBase*>& _game_objects)
{
	proxies_.clear();
	max_search_radius_ = 0.f;
	proxies_.reserve(std::max(proxies_.capacity(), _game_objects.size()));

	for (auto* game_object : _game_objects)
	{
		Proxy proxy{};
		if (!_TryGetProxy(game_object, proxy))
			continue;

		max_search_radius_ = std::max(max_search_radius_, proxy.search_radius_);
		proxies_.push_back(proxy);
	}
}

void EnemySeparationSystem::_BuildGrid()
{
	cell_entries_.clear();
	cell_ranges_.clear();
	cell_entries_.reserve(std::max(cell_entries_.capacity(), proxies_.size()));

	for (_int idx = 0; idx < s_int(proxies_.size()); ++idx)
	{
		const auto& proxy = proxies_[idx];
		cell_entries_.push_back(CellEntry{
			_MakeCellKey(_ToCell(proxy.center_.x), _ToCell(proxy.center_.y)),
			idx
		});
	}

	std::sort(
		cell_entries_.begin(),
		cell_entries_.end(),
		[](const CellEntry& _left, const CellEntry& _right)
	{
		if (_left.key_ != _right.key_)
			return _left.key_ < _right.key_;
		return _left.proxy_index_ < _right.proxy_index_;
	});

	cell_ranges_.reserve(std::max(cell_ranges_.capacity(), cell_entries_.size()));

	_int begin = 0;
	while (begin < s_int(cell_entries_.size()))
	{
		_int end = begin + 1;
		while (end < s_int(cell_entries_.size()) &&
			cell_entries_[end].key_ == cell_entries_[begin].key_)
		{
			++end;
		}

		cell_ranges_.push_back(CellRange{ cell_entries_[begin].key_, begin, end });
		begin = end;
	}
}

void EnemySeparationSystem::_ResolvePairs()
{
	if (max_search_radius_ <= 0.f)
		return;

	for (_int left_idx = 0; left_idx < s_int(proxies_.size()); ++left_idx)
	{
		const auto& left = proxies_[left_idx];
		const _int center_cell_x = _ToCell(left.center_.x);
		const _int center_cell_y = _ToCell(left.center_.y);
		const _int search_cell_radius = std::max(
			1,
			s_int(std::ceil((left.search_radius_ + max_search_radius_) / ENEMY_SEPARATION_CELL_SIZE)));

		for (_int cell_y = center_cell_y - search_cell_radius; cell_y <= center_cell_y + search_cell_radius; ++cell_y)
		{
			for (_int cell_x = center_cell_x - search_cell_radius; cell_x <= center_cell_x + search_cell_radius; ++cell_x)
			{
				const auto* range = _FindCellRange(_MakeCellKey(cell_x, cell_y));
				if (range == nullptr)
					continue;

				for (_int entry_idx = range->begin_; entry_idx < range->end_; ++entry_idx)
				{
					const _int right_idx = cell_entries_[entry_idx].proxy_index_;
					if (right_idx <= left_idx)
						continue;

					_Vector2 correction = _Vector2::Zero();
					if (!_TryComputeSeparation(left, proxies_[right_idx], correction))
						continue;

					const _float total_weight = std::max(
						ENEMY_SEPARATION_EPSILON,
						left.move_weight_ + proxies_[right_idx].move_weight_);

					proxies_[left_idx].displacement_ -= correction * (left.move_weight_ / total_weight);
					proxies_[right_idx].displacement_ += correction * (proxies_[right_idx].move_weight_ / total_weight);
				}
			}
		}
	}
}

_bool EnemySeparationSystem::_ApplyDisplacements(_double _delta_time)
{
	const _float frame_scale = std::clamp(s_cast(_float, _delta_time * 60.0), 0.5f, 2.f);
	const _float max_displacement = ENEMY_SEPARATION_MAX_DISPLACEMENT_PER_ITERATION * frame_scale;
	_bool applied_any = false;

	for (auto& proxy : proxies_)
	{
		auto displacement = proxy.displacement_;
		const _float length_sq = displacement.LengthSq();
		if (length_sq <= ENEMY_SEPARATION_EPSILON)
			continue;

		const _float length = std::sqrt(length_sq);
		if (length > max_displacement)
			displacement = displacement * (max_displacement / length);

		proxy.movement_->ApplyExternalDisplacement(_Vector3(displacement, 0.f));

		const auto position = proxy.transform_->Position();
		proxy.center_ = _Vector2(position.x, position.y) + proxy.center_offset_;
		applied_any = true;
	}

	return applied_any;
}

const EnemySeparationSystem::CellRange* EnemySeparationSystem::_FindCellRange(CellKey _key) const
{
	const auto iter = std::lower_bound(
		cell_ranges_.begin(),
		cell_ranges_.end(),
		_key,
		[](const CellRange& _range, CellKey _target)
	{
		return _range.key_ < _target;
	});

	if (iter == cell_ranges_.end() || iter->key_ != _key)
		return nullptr;

	return &(*iter);
}

EnemySeparationSystem::CellKey EnemySeparationSystem::_MakeCellKey(_int _x, _int _y) const
{
	const auto ux = s_cast(std::uint64_t, s_cast(std::uint32_t, _x));
	const auto uy = s_cast(std::uint64_t, s_cast(std::uint32_t, _y));
	return (ux << 32) | uy;
}

_int EnemySeparationSystem::_ToCell(_float _value) const
{
	return s_int(std::floor(_value / ENEMY_SEPARATION_CELL_SIZE));
}

_bool EnemySeparationSystem::_TryGetProxy(GameObjectBase* _game_object, Proxy& _out_proxy) const
{
	if (_game_object == nullptr ||
		!_game_object->IsActive() ||
		_game_object->IsPendingDestruction())
	{
		return false;
	}

	auto* enemy = d_cast(Enemy*, _game_object);
	if (enemy == nullptr)
		return false;

	const auto state = enemy->GetActionState();
	if (state == EnemyActionState::Spawn || state == EnemyActionState::Death)
		return false;

	const auto* status = enemy->GetStatus();
	if (status != nullptr && status->IsDead())
		return false;

	auto* transform = enemy->GetTransform();
	auto* movement = enemy->GetMovement();
	auto* body_collider = enemy->GetDefaultCollider(UnitDefaultColliderId::Body);
	if (transform == nullptr ||
		movement == nullptr ||
		body_collider == nullptr ||
		!body_collider->IsEnable())
	{
		return false;
	}

	const _float radius_x = std::max(ENEMY_SEPARATION_MIN_RADIUS, body_collider->GetRadiusX());
	const _float radius_y = std::max(
		ENEMY_SEPARATION_MIN_RADIUS,
		radius_x * std::max(ENEMY_SEPARATION_MIN_Y_RATIO, body_collider->GetYRatio()));
	const auto position = transform->Position();
	const auto center_offset = body_collider->GetCenterOffset();

	_out_proxy.enemy_ = enemy;
	_out_proxy.transform_ = transform;
	_out_proxy.movement_ = movement;
	_out_proxy.center_offset_ = center_offset;
	_out_proxy.center_ = _Vector2(position.x, position.y) + center_offset;
	_out_proxy.radius_x_ = radius_x;
	_out_proxy.radius_y_ = radius_y;
	_out_proxy.search_radius_ = std::max(radius_x, radius_y);
	_out_proxy.move_weight_ = movement->IsDashing() ? ENEMY_SEPARATION_DASH_MOVE_WEIGHT : 1.f;
	_out_proxy.object_id_ = enemy->ID();
	return true;
}

_bool EnemySeparationSystem::_TryComputeSeparation(const Proxy& _left, const Proxy& _right, _Vector2& _out_correction) const
{
	const _Vector2 delta = _right.center_ - _left.center_;
	const _float combined_x = std::max(ENEMY_SEPARATION_MIN_RADIUS, _left.radius_x_ + _right.radius_x_);
	const _float combined_y = std::max(ENEMY_SEPARATION_MIN_RADIUS, _left.radius_y_ + _right.radius_y_);

	const _float normalized_x = delta.x / combined_x;
	const _float normalized_y = delta.y / combined_y;
	const _float normalized_dist_sq = normalized_x * normalized_x + normalized_y * normalized_y;
	if (normalized_dist_sq >= 1.f)
		return false;

	const _float distance_sq = delta.LengthSq();
	_Vector2 normal = _Vector2::Zero();
	_float distance = 0.f;
	if (distance_sq > ENEMY_SEPARATION_EPSILON)
	{
		distance = std::sqrt(distance_sq);
		normal = delta / distance;
	}
	else
	{
		const _float seed = s_float((_left.object_id_ * 928371 + _right.object_id_ * 364479) % 4096);
		const _float angle = (seed / 4096.f) * ENEMY_SEPARATION_TWO_PI;
		normal = _Vector2(std::cos(angle), std::sin(angle));
	}

	const _float boundary_denom =
		(normal.x * normal.x) / (combined_x * combined_x) +
		(normal.y * normal.y) / (combined_y * combined_y);
	if (boundary_denom <= ENEMY_SEPARATION_EPSILON)
		return false;

	const _float target_distance = 1.f / std::sqrt(boundary_denom);
	const _float penetration = target_distance - distance;
	if (penetration <= 0.f)
		return false;

	_out_correction = normal * (penetration * ENEMY_SEPARATION_STRENGTH);
	return true;
}
