#pragma once

#include "ParticleEventSetData.h"
#include "ParticleService.h"

struct ParticleEventSetPlayContext
{
	_Vector2 world_origin_ = _Vector2::Zero();
	_float direction_deg_ = 0.f;
	_bool has_direction_ = false;
};

class ParticleEventSetPlayer final
	: public IUpdatable
{
public:
	_int Update(_double _delta_time) override;

	void Play(const ParticleEventSet& _event_set, const _Vector2& _world_origin);
	void Play(const ParticleEventSet& _event_set, const ParticleEventSetPlayContext& _play_context);
	void StopAll();
	_bool IsPlaying() const { return !active_playbacks_.empty(); }

private:
	struct ActivePlayback
	{
		ParticleEventSet event_set_;
		ParticleEventSetPlayContext play_context_;
		std::vector<_bool> fired_events_;
		std::vector<ParticleEmitterHandle> emitter_handles_;
		_float elapsed_sec_ = 0.f;
		_float completion_elapsed_sec_ = 0.f;
		_bool has_infinite_emitter_ = false;
	};

	void _FireEvent(ActivePlayback& _playback, const ParticleEventSpec& _event);
	_float _ResolveEventDirectionRadian(const ActivePlayback& _playback, const ParticleEventSpec& _event) const;
	_float _CalculateCompletionTime(const ParticleEventSet& _event_set, _bool& _out_has_infinite_emitter) const;

	std::vector<ActivePlayback> active_playbacks_;
};
