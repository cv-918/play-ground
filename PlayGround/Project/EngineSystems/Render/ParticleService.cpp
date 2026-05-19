#include "framework.h"
#include "ParticleService.h"

#include "GamePlay/Actors/GameObjectBase.h"
#include "GamePlaySystems/Json/ParticleDataManager.h"

namespace
{
	constexpr _float kParticleGravityAcceleration = 980.f;
}

_bool ParticleService::Initialize(_uint _pool_size)
{
	ClearSceneState();

	pool_size_ = _pool_size;
	particle_pool_.resize(pool_size_);

	free_indices_.resize(pool_size_);
	std::iota(free_indices_.begin(), free_indices_.end(), 0);
	next_emitter_handle_ = 1;
	pool_stats_ = ParticlePoolStats();
	pool_stats_.pool_size_ = pool_size_;
	pool_exhaustion_log_cooldown_sec_ = 0.f;
	return true;
}

_int ParticleService::Update(_double _delta_time)
{
	const auto dt = s_float(_delta_time);
	pool_stats_.dropped_this_frame_ = 0;
	if (pool_exhaustion_log_cooldown_sec_ > 0.f)
		pool_exhaustion_log_cooldown_sec_ = std::max(0.f, pool_exhaustion_log_cooldown_sec_ - dt);

	_UpdateEmitters(dt);

	for (auto it = active_indices_.begin(); it != active_indices_.end(); )
	{
		_uint idx = *it;
		auto& p = particle_pool_[idx];

		p.life_time_ -= dt;
		if (p.life_time_ <= 0.f)
		{
			p.is_active_ = false;
			free_indices_.push_back(idx);
			it = active_indices_.erase(it);
			continue;
		}

		_float ratio = 1.0f - (p.life_time_ / p.max_life_time_);

		p.velocity_.y += kParticleGravityAcceleration * p.setting_.gravityScale * dt;
		p.velocity_ *= std::max(0.f, 1.0f - p.setting_.airResistance * dt);
		p.position_ += p.velocity_ * dt;

		p.currentScale = _MathFunc::LerpWithEase(
			p.setting_.startScale,
			p.setting_.endScale,
			ratio,
			p.setting_.sizeEase
		);

		_int a = s_int(std::round(_MathFunc::LerpWithEase((_float)p.setting_.startColor.GetAlpha(), (_float)p.setting_.endColor.GetAlpha(), ratio, p.setting_.colorEase)));
		_int r = s_int(std::round(_MathFunc::LerpWithEase((_float)p.setting_.startColor.GetR(), (_float)p.setting_.endColor.GetR(), ratio, p.setting_.colorEase)));
		_int g = s_int(std::round(_MathFunc::LerpWithEase((_float)p.setting_.startColor.GetG(), (_float)p.setting_.endColor.GetG(), ratio, p.setting_.colorEase)));
		_int b = s_int(std::round(_MathFunc::LerpWithEase((_float)p.setting_.startColor.GetB(), (_float)p.setting_.endColor.GetB(), ratio, p.setting_.colorEase)));

		p.currentColor = _Color(a, r, g, b);

		++it;
	}

	pool_stats_.active_count_ = s_uint(active_indices_.size());
	pool_stats_.peak_active_count_ = std::max(pool_stats_.peak_active_count_, pool_stats_.active_count_);
	return UPDATE_CONTINUE;
}

void ParticleService::Render(_double _delta_time)
{
	for (_uint idx : active_indices_)
	{
		auto& p = particle_pool_[idx];
		if (p.currentScale <= 0.01f || p.currentColor.GetAlpha() <= 1)
			continue;

		if (p.setting_.textureKey.empty())
		{
			_float r = p.currentScale * 5.0f;
			_DrawFunc::FillCircle(_Point(p.position_.x, p.position_.y), r, p.currentColor);
		}
		else
		{
			auto tex = _GraphicSourceMgr.GetTexture(p.setting_.textureKey);
			if (tex)
			{
				_float w = tex->Width() * p.currentScale;
				_float h = tex->Height() * p.currentScale;
				const _RectF dest_rect(p.position_.x - w * 0.5f, p.position_.y - h * 0.5f, p.position_.x + w * 0.5f, p.position_.y + h * 0.5f);
				_DrawFunc::DrawTexture(tex, dest_rect, p.currentColor, p.currentColor.GetAlpha());
			}
		}
	}
}

void ParticleService::Emit(const ParticleSetting& _setting, const _Vector2& _pos, _uint _count, _float _direction_radian)
{
	const auto shape_radius = std::max(0.f, _setting.shapeRadius);

	for (_uint i = 0; i < _count; ++i)
	{
		auto particle_pos = _pos;
		switch (_setting.shape)
		{
		case EmitterShape::Circle:
		{
			const auto angle = _MathFunc::ToRadian(_Random.Range(0.f, 360.f));
			const auto dist = _Random.Range(0.f, shape_radius);
			particle_pos.x += cosf(angle) * dist;
			particle_pos.y += sinf(angle) * dist;
			break;
		}
		case EmitterShape::Box:
			particle_pos.x += _Random.Range(-shape_radius, shape_radius);
			particle_pos.y += _Random.Range(-shape_radius, shape_radius);
			break;
		case EmitterShape::Point:
		default:
			break;
		}

		const auto speed = _Random.Range(_setting.minSpeed, _setting.maxSpeed);
		const auto angle_offset = _Random.Range(-(_setting.arcAngle * 0.5f), _setting.arcAngle * 0.5f);
		const auto move_angle = _direction_radian + _MathFunc::ToRadian(angle_offset);
		const _Vector2 velocity{ cosf(move_angle) * speed, sinf(move_angle) * speed };
		const auto life_time = _Random.Range(_setting.minLife, _setting.maxLife);
		_ActivateParticle(_setting, particle_pos, velocity, life_time, _setting.startScale);
	}
}

void ParticleService::EmitCustom(
	const ParticleSetting& _setting,
	const _Vector2& _pos,
	const _Vector2& _velocity,
	_float _life_time_override,
	_float _start_scale_override)
{
	const auto life_time = (_life_time_override > 0.f)
		? _life_time_override
		: _Random.Range(_setting.minLife, _setting.maxLife);
	const auto start_scale = (_start_scale_override >= 0.f)
		? _start_scale_override
		: _setting.startScale;

	_ActivateParticle(_setting, _pos, _velocity, life_time, start_scale);
}

ParticleEmitterHandle ParticleService::PlayEmitterAt(const ParticleEmitterSpec& _spec, const _Vector2& _world_pos, _float _direction_radian)
{
	return _PlayEmitterInternal(_spec, nullptr, _world_pos, nullptr, _Vector2::Zero(), _direction_radian);
}

ParticleEmitterHandle ParticleService::PlayEmitterAt(const ParticleEmitterSpec& _spec, const ParticleSetting& _setting, const _Vector2& _world_pos, _float _direction_radian)
{
	return _PlayEmitterInternal(_spec, &_setting, _world_pos, nullptr, _Vector2::Zero(), _direction_radian);
}

ParticleEmitterHandle ParticleService::PlayEmitterAttached(const ParticleEmitterSpec& _spec, GameObjectBase* _owner, const _Vector2& _local_offset, _float _direction_radian)
{
	if (_owner == nullptr || _owner->IsPendingDestruction() || _owner->GetTransform() == nullptr)
	{
		_SYSTEM_LOG_ERROR(L"PlayEmitterAttached failed: owner is invalid.");
		return 0;
	}

	return _PlayEmitterInternal(_spec, nullptr, _Vector2::Zero(), _owner, _local_offset, _direction_radian);
}

void ParticleService::StopEmitter(ParticleEmitterHandle _handle)
{
	const auto iter = active_emitters_.find(_handle);
	if (iter == active_emitters_.end())
		return;

	_SetEmitterPendingStop(iter->second, ParticleEmitterStopReason::Explicit);
}

void ParticleService::StopAllEmittersByOwner(GameObjectBase* _owner)
{
	if (_owner == nullptr)
		return;

	for (auto& [handle, emitter] : active_emitters_)
	{
		(void)handle;
		if (emitter.owner_ == _owner)
			_SetEmitterPendingStop(emitter, ParticleEmitterStopReason::Explicit);
	}
}

void ParticleService::ClearSceneState()
{
	_ClearEmitters(ParticleEmitterStopReason::ServiceShutdown);
	_ClearParticles();
}

void ParticleService::_ActivateParticle(
	const ParticleSetting& _setting,
	const _Vector2& _pos,
	const _Vector2& _velocity,
	_float _life_time,
	_float _start_scale)
{
	if (free_indices_.empty())
	{
		++pool_stats_.dropped_this_frame_;
		++pool_stats_.dropped_total_;
		pool_stats_.active_count_ = s_uint(active_indices_.size());

		if (pool_exhaustion_log_cooldown_sec_ <= 0.f)
		{
			_SYSTEM_LOG_WARN(
				L"Particle pool exhausted. dropped_this_frame=%u dropped_total=%u active=%u pool=%u",
				pool_stats_.dropped_this_frame_,
				pool_stats_.dropped_total_,
				pool_stats_.active_count_,
				pool_stats_.pool_size_);
			pool_exhaustion_log_cooldown_sec_ = 1.f;
		}

		return;
	}

	const auto clamped_life_time = std::max(0.01f, _life_time);
	const auto start_scale = std::max(0.f, _start_scale);

	_uint idx = free_indices_.back();
	free_indices_.pop_back();
	active_indices_.push_back(idx);

	auto& p = particle_pool_[idx];
	p.setting_ = _setting;
	p.is_active_ = true;
	p.position_ = _pos;
	p.velocity_ = _velocity;
	p.max_life_time_ = clamped_life_time;
	p.life_time_ = clamped_life_time;
	p.currentScale = start_scale;
	p.currentColor = _setting.startColor;
	p.setting_.startScale = start_scale;

	pool_stats_.active_count_ = s_uint(active_indices_.size());
	pool_stats_.peak_active_count_ = std::max(pool_stats_.peak_active_count_, pool_stats_.active_count_);
}

ParticleEmitterHandle ParticleService::_CreateEmitterHandle()
{
	constexpr ParticleEmitterHandle invalid_handle = 0;
	const auto start = next_emitter_handle_;

	do
	{
		if (next_emitter_handle_ == invalid_handle)
			++next_emitter_handle_;

		const auto candidate = next_emitter_handle_++;
		if (candidate != invalid_handle &&
			active_emitters_.find(candidate) == active_emitters_.end())
		{
			return candidate;
		}
	} while (next_emitter_handle_ != start);

	return invalid_handle;
}

ParticleEmitterHandle ParticleService::_PlayEmitterInternal(
	const ParticleEmitterSpec& _spec,
	const ParticleSetting* _setting_override,
	const _Vector2& _world_pos,
	GameObjectBase* _owner,
	const _Vector2& _local_offset,
	_float _direction_radian)
{
	const auto* setting = (_setting_override != nullptr) ? _setting_override : _ResolveParticleSetting(_spec);
	if (!_ValidateEmitterSpec(_spec, setting))
	{
		_LogInvalidEmitterSpec(_spec);
		return 0;
	}

	ActiveEmitter emitter;
	emitter.handle_ = _CreateEmitterHandle();
	if (emitter.handle_ == 0)
	{
		_SYSTEM_LOG_ERROR(L"Failed to allocate particle emitter handle.");
		return 0;
	}

	emitter.spec_ = _spec;
	emitter.resolved_particle_setting_ = *setting;
	emitter.has_resolved_particle_setting_ = true;
	emitter.owner_ = _owner;
	emitter.fixed_world_position_ = _world_pos;
	emitter.local_offset_ = _local_offset;
	emitter.emission_direction_radian_ = _direction_radian;

	if (emitter.owner_)
	{
		const auto handle = emitter.handle_;
		emitter.owner_callback_id_ = emitter.owner_->AddDestructionCallback(
			[this, handle]()
		{
			const auto iter = active_emitters_.find(handle);
			if (iter == active_emitters_.end())
				return;

			_SetEmitterPendingStop(iter->second, ParticleEmitterStopReason::OwnerDestroyed);
		});
	}

	active_emitters_.emplace(emitter.handle_, emitter);
	return emitter.handle_;
}

const ParticleSetting* ParticleService::_ResolveParticleSetting(const ParticleEmitterSpec& _spec) const
{
	return _ParticleDataMgr.GetData(_spec.particle_setting_id_);
}

_bool ParticleService::_ValidateEmitterSpec(const ParticleEmitterSpec& _spec, const ParticleSetting* _setting) const
{
	if (_spec.emit_interval_sec_ <= 0.f)
		return false;

	if (_spec.emit_count_per_tick_ == 0)
		return false;

	if (_spec.duration_sec_ < 0.f)
		return false;

	return _setting != nullptr;
}

void ParticleService::_SetEmitterPendingStop(ActiveEmitter& _emitter, ParticleEmitterStopReason _reason)
{
	const auto priority = [](ParticleEmitterStopReason _value)
	{
		switch (_value)
		{
		case ParticleEmitterStopReason::Explicit: return 4;
		case ParticleEmitterStopReason::OwnerDestroyed: return 3;
		case ParticleEmitterStopReason::ServiceShutdown: return 2;
		case ParticleEmitterStopReason::DurationExpired: return 1;
		case ParticleEmitterStopReason::InvalidSpec:
		default:
			return 0;
		}
	};

	if (!_emitter.pending_stop_ || priority(_reason) > priority(_emitter.stop_reason_))
	{
		_emitter.pending_stop_ = true;
		_emitter.stop_reason_ = _reason;
	}
}

void ParticleService::_UpdateEmitters(_float _dt)
{
	for (auto& [handle, emitter] : active_emitters_)
	{
		(void)handle;

		if (emitter.pending_stop_ || !emitter.has_resolved_particle_setting_)
			continue;

		_float emit_dt = _dt;
		if (emitter.spec_.duration_sec_ > 0.f)
		{
			const auto remaining = std::max(0.f, emitter.spec_.duration_sec_ - emitter.elapsed_sec_);
			emit_dt = std::min(_dt, remaining);
		}

		const auto world_pos = _GetEmitterWorldPosition(emitter);
		const auto emission_direction_radian = _GetEmitterEmissionDirectionRadian(emitter);
		if (!emitter.pending_stop_ && emit_dt > 0.f)
		{
			emitter.emit_accumulator_sec_ += emit_dt;
			while (emitter.emit_accumulator_sec_ >= emitter.spec_.emit_interval_sec_)
			{
				Emit(emitter.resolved_particle_setting_, world_pos, emitter.spec_.emit_count_per_tick_, emission_direction_radian);
				emitter.emit_accumulator_sec_ -= emitter.spec_.emit_interval_sec_;
			}
		}

		emitter.elapsed_sec_ += _dt;
		if (emitter.spec_.duration_sec_ > 0.f && emitter.elapsed_sec_ >= emitter.spec_.duration_sec_)
			_SetEmitterPendingStop(emitter, ParticleEmitterStopReason::DurationExpired);
	}

	for (auto iter = active_emitters_.begin(); iter != active_emitters_.end();)
	{
		if (!iter->second.pending_stop_)
		{
			++iter;
			continue;
		}

		_DetachEmitterOwner(iter->second);
		iter = active_emitters_.erase(iter);
	}
}

_Vector2 ParticleService::_GetEmitterWorldPosition(ActiveEmitter& _emitter)
{
	if (_emitter.owner_ == nullptr)
		return _emitter.fixed_world_position_;

	if (_emitter.owner_->IsPendingDestruction() || _emitter.owner_->GetTransform() == nullptr)
	{
		_SetEmitterPendingStop(_emitter, ParticleEmitterStopReason::OwnerDestroyed);
		return _emitter.fixed_world_position_;
	}

	const auto owner_transform = _emitter.owner_->GetTransform();
	const auto owner_position = _Vector2(owner_transform->Position());
	const auto right = _Vector2(owner_transform->Right2D());
	const auto forward = _Vector2(owner_transform->Forward2D());
	return owner_position + (right * _emitter.local_offset_.x) + (forward * _emitter.local_offset_.y);
}

_float ParticleService::_GetEmitterEmissionDirectionRadian(ActiveEmitter& _emitter)
{
	return _emitter.emission_direction_radian_;
}

void ParticleService::_ClearEmitters(ParticleEmitterStopReason _reason)
{
	for (auto& [handle, emitter] : active_emitters_)
	{
		(void)handle;
		_SetEmitterPendingStop(emitter, _reason);
		_DetachEmitterOwner(emitter);
	}

	active_emitters_.clear();
}

void ParticleService::_ClearParticles()
{
	active_indices_.clear();
	free_indices_.resize(pool_size_);
	std::iota(free_indices_.begin(), free_indices_.end(), 0);
	pool_stats_.pool_size_ = pool_size_;
	pool_stats_.active_count_ = 0;
	pool_stats_.peak_active_count_ = 0;
	pool_stats_.dropped_this_frame_ = 0;

	for (auto& particle : particle_pool_)
	{
		particle.is_active_ = false;
		particle.life_time_ = 0.f;
		particle.max_life_time_ = 0.f;
		particle.position_ = _Vector2::Zero();
		particle.velocity_ = _Vector2::Zero();
		particle.currentScale = 1.f;
		particle.currentColor = _Color();
	}
}

void ParticleService::_DetachEmitterOwner(ActiveEmitter& _emitter)
{
	if (_emitter.owner_ &&
		_emitter.owner_callback_id_ != IDestroyable::kInvalidDestructionCallbackId)
	{
		_emitter.owner_->RemoveDestructionCallback(_emitter.owner_callback_id_);
	}

	_emitter.owner_ = nullptr;
	_emitter.owner_callback_id_ = IDestroyable::kInvalidDestructionCallbackId;
}

void ParticleService::_LogInvalidEmitterSpec(const ParticleEmitterSpec& _spec) const
{
	_SYSTEM_LOG_ERROR(
		L"Invalid ParticleEmitterSpec. id=%u particle_setting_id=%u emit_interval=%.3f emit_count=%u duration=%.3f",
		_spec.id_,
		_spec.particle_setting_id_,
		_spec.emit_interval_sec_,
		_spec.emit_count_per_tick_,
		_spec.duration_sec_);
}
