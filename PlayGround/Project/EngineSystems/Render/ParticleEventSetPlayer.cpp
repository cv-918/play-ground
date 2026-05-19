#include "framework.h"
#include "ParticleEventSetPlayer.h"

_int ParticleEventSetPlayer::Update(_double _delta_time)
{
	const auto dt = s_float(_delta_time);

	for (auto& playback : active_playbacks_)
	{
		playback.elapsed_sec_ += dt;

		for (size_t i = 0; i < playback.event_set_.events_.size(); ++i)
		{
			if (playback.fired_events_[i])
				continue;

			const auto& event_spec = playback.event_set_.events_[i];
			if (playback.elapsed_sec_ < event_spec.delay_sec_)
				continue;

			_FireEvent(playback, event_spec);
			playback.fired_events_[i] = true;
		}
	}

	for (auto iter = active_playbacks_.begin(); iter != active_playbacks_.end();)
	{
		if (!iter->has_infinite_emitter_ &&
			iter->elapsed_sec_ >= iter->completion_elapsed_sec_)
		{
			iter = active_playbacks_.erase(iter);
			continue;
		}

		++iter;
	}

	return UPDATE_CONTINUE;
}

void ParticleEventSetPlayer::Play(const ParticleEventSet& _event_set, const _Vector2& _world_origin)
{
	ParticleEventSetPlayContext play_context;
	play_context.world_origin_ = _world_origin;
	Play(_event_set, play_context);
}

void ParticleEventSetPlayer::Play(const ParticleEventSet& _event_set, const ParticleEventSetPlayContext& _play_context)
{
	if (_event_set.events_.empty())
	{
		_SYSTEM_LOG_WARN(L"ParticleEventSet play ignored: event set is empty. id=%u", _event_set.id_);
		return;
	}

	ActivePlayback playback;
	playback.event_set_ = _event_set;
	playback.play_context_ = _play_context;
	playback.fired_events_.assign(_event_set.events_.size(), false);
	playback.completion_elapsed_sec_ = _CalculateCompletionTime(_event_set, playback.has_infinite_emitter_);
	active_playbacks_.push_back(std::move(playback));
}

void ParticleEventSetPlayer::StopAll()
{
	for (auto& playback : active_playbacks_)
	{
		for (const auto handle : playback.emitter_handles_)
		{
			if (handle != 0)
				_ParticleService.StopEmitter(handle);
		}
	}

	active_playbacks_.clear();
}

void ParticleEventSetPlayer::_FireEvent(ActivePlayback& _playback, const ParticleEventSpec& _event)
{
	const auto world_pos = _playback.play_context_.world_origin_ + _event.local_offset_;
	const auto direction_radian = _ResolveEventDirectionRadian(_playback, _event);

	switch (_event.playback_type_)
	{
	case ParticleEventPlaybackType::Burst:
		_ParticleService.Emit(_event.particle_setting_, world_pos, std::max(1u, _event.burst_count_), direction_radian);
		break;

	case ParticleEventPlaybackType::Emitter:
	{
		auto emitter_spec = _event.emitter_spec_;
		emitter_spec.particle_setting_id_ = _event.particle_setting_.id_;
		const auto handle = _ParticleService.PlayEmitterAt(emitter_spec, _event.particle_setting_, world_pos, direction_radian);
		if (handle != 0)
			_playback.emitter_handles_.push_back(handle);
		break;
	}
	}
}

_float ParticleEventSetPlayer::_ResolveEventDirectionRadian(const ActivePlayback& _playback, const ParticleEventSpec& _event) const
{
	auto direction_deg = _event.base_direction_deg_;
	if (_event.direction_mode_ == ParticleEventDirectionMode::PlayContext &&
		_playback.play_context_.has_direction_)
	{
		direction_deg += _playback.play_context_.direction_deg_ * std::clamp(_event.direction_influence_, 0.f, 1.f);
	}

	return _MathFunc::ToRadian(direction_deg);
}

_float ParticleEventSetPlayer::_CalculateCompletionTime(const ParticleEventSet& _event_set, _bool& _out_has_infinite_emitter) const
{
	_out_has_infinite_emitter = false;

	_float completion_time = 0.f;
	for (const auto& event_spec : _event_set.events_)
	{
		const auto max_life = std::max(0.01f, event_spec.particle_setting_.maxLife);
		auto event_completion_time = event_spec.delay_sec_ + max_life;

		if (event_spec.playback_type_ == ParticleEventPlaybackType::Emitter)
		{
			if (event_spec.emitter_spec_.duration_sec_ <= 0.f)
			{
				_out_has_infinite_emitter = true;
			}
			else
			{
				event_completion_time = event_spec.delay_sec_ + event_spec.emitter_spec_.duration_sec_ + max_life;
			}
		}

		completion_time = std::max(completion_time, event_completion_time);
	}

	return completion_time + 0.05f;
}
