#pragma once
#include "ParticleData.h"
#define _ParticleService ParticleService::Get()

class GameObjectBase;

using ParticleEmitterHandle = _uint;

enum class ParticleEmitterStopReason
{
	Explicit,
	OwnerDestroyed,
	ServiceShutdown,
	DurationExpired,
	InvalidSpec,
};

class ParticleService final
	: public ISingleton<ParticleService>
	, public IInitializable
	, public IUpdatable
{
public:
	_bool Initialize(_uint _pool_size);
	_int Update(_double _delta_time) override;
	void Render(_double _delta_time) override;

	// Immediate one-shot burst emission.
	void Emit(const ParticleSetting& _setting, const _Vector2& _pos, _uint _count = 1);
	void EmitCustom(
		const ParticleSetting& _setting,
		const _Vector2& _pos,
		const _Vector2& _velocity,
		_float _life_time_override = -1.f,
		_float _start_scale_override = -1.f);
	ParticleEmitterHandle PlayEmitterAt(const ParticleEmitterSpec& _spec, const _Vector2& _world_pos);
	ParticleEmitterHandle PlayEmitterAttached(const ParticleEmitterSpec& _spec, GameObjectBase* _owner, const _Vector2& _local_offset = _Vector2::Zero());
	void StopEmitter(ParticleEmitterHandle _handle);
	void StopAllEmittersByOwner(GameObjectBase* _owner);
	void ClearSceneState();

private:
	void _ActivateParticle(
		const ParticleSetting& _setting,
		const _Vector2& _pos,
		const _Vector2& _velocity,
		_float _life_time,
		_float _start_scale);

	struct ActiveEmitter
	{
		ParticleEmitterHandle handle_ = 0;
		ParticleEmitterSpec spec_;
		const ParticleSetting* resolved_particle_setting_ = nullptr;
		GameObjectBase* owner_ = nullptr;
		IDestroyable::DestructionCallbackId owner_callback_id_ = IDestroyable::kInvalidDestructionCallbackId;
		_Vector2 fixed_world_position_ = _Vector2::Zero();
		_Vector2 local_offset_ = _Vector2::Zero();
		_float elapsed_sec_ = 0.f;
		_float emit_accumulator_sec_ = 0.f;
		_bool pending_stop_ = false;
		ParticleEmitterStopReason stop_reason_ = ParticleEmitterStopReason::Explicit;
	};

	ParticleEmitterHandle _CreateEmitterHandle();
	ParticleEmitterHandle _PlayEmitterInternal(const ParticleEmitterSpec& _spec, const _Vector2& _world_pos, GameObjectBase* _owner, const _Vector2& _local_offset);
	const ParticleSetting* _ResolveParticleSetting(const ParticleEmitterSpec& _spec) const;
	_bool _ValidateEmitterSpec(const ParticleEmitterSpec& _spec, const ParticleSetting* _setting) const;
	void _SetEmitterPendingStop(ActiveEmitter& _emitter, ParticleEmitterStopReason _reason);
	void _UpdateEmitters(_float _dt);
	_Vector2 _GetEmitterWorldPosition(ActiveEmitter& _emitter);
	void _ClearEmitters(ParticleEmitterStopReason _reason);
	void _ClearParticles();
	void _DetachEmitterOwner(ActiveEmitter& _emitter);
	void _LogInvalidEmitterSpec(const ParticleEmitterSpec& _spec) const;

	std::vector<Particle> particle_pool_;
	std::list<_uint> active_indices_;
	std::vector<_uint> free_indices_;
	_uint pool_size_ = 0;
	std::unordered_map<ParticleEmitterHandle, ActiveEmitter> active_emitters_;
	ParticleEmitterHandle next_emitter_handle_ = 1;
};
