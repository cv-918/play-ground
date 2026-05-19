#pragma once

#include "ParticleData.h"

enum class ParticleEventPlaybackType
{
	Burst,
	Emitter,
};

enum class ParticleEventDirectionMode
{
	World,
	PlayContext,
};

struct ParticleEventSpec
{
	_uint id_ = 0;
	std::wstring name_;
	ParticleEventPlaybackType playback_type_ = ParticleEventPlaybackType::Burst;
	_float delay_sec_ = 0.f;
	_Vector2 local_offset_ = _Vector2::Zero();
	ParticleEventDirectionMode direction_mode_ = ParticleEventDirectionMode::World;
	_float base_direction_deg_ = 0.f;
	_float direction_influence_ = 0.f;
	_uint burst_count_ = 1;
	ParticleSetting particle_setting_;
	ParticleEmitterSpec emitter_spec_;
};

struct ParticleEventSet
{
	_uint id_ = 0;
	std::wstring name_;
	std::vector<ParticleEventSpec> events_;
};

namespace ParticleEventSetJson
{
	inline std::wstring ReadWString(const nlohmann::json& _json, const char* _field, const std::wstring& _default_value)
	{
		if (!_json.contains(_field) || !_json.at(_field).is_string())
			return _default_value;

		return _UtilFunc::ToWString(_json.at(_field).get<std::string>());
	}
}

inline void to_json(nlohmann::json& j, const ParticleEventSpec& s)
{
	j = nlohmann::json{
		{"id_", s.id_},
		{"name_", _UtilFunc::ToString(s.name_)},
		{"playback_type_", static_cast<int>(s.playback_type_)},
		{"delay_sec_", s.delay_sec_},
		{"local_offset_x_", s.local_offset_.x},
		{"local_offset_y_", s.local_offset_.y},
		{"direction_mode_", static_cast<int>(s.direction_mode_)},
		{"base_direction_deg_", s.base_direction_deg_},
		{"direction_influence_", s.direction_influence_},
		{"burst_count_", s.burst_count_},
		{"particle_setting_", s.particle_setting_},
		{"emitter_spec_", s.emitter_spec_}
	};
}

inline void from_json(const nlohmann::json& j, ParticleEventSpec& s)
{
	j.at("id_").get_to(s.id_);
	s.name_ = ParticleEventSetJson::ReadWString(j, "name_", L"Particle Event");

	int playback_type = static_cast<int>(ParticleEventPlaybackType::Burst);
	if (j.contains("playback_type_"))
		j.at("playback_type_").get_to(playback_type);
	s.playback_type_ = static_cast<ParticleEventPlaybackType>(playback_type);

	s.delay_sec_ = std::max(0.f, j.value("delay_sec_", 0.f));
	s.local_offset_.x = j.value("local_offset_x_", 0.f);
	s.local_offset_.y = j.value("local_offset_y_", 0.f);
	s.direction_mode_ = static_cast<ParticleEventDirectionMode>(std::clamp(j.value("direction_mode_", 0), 0, 1));
	s.base_direction_deg_ = j.value("base_direction_deg_", 0.f);
	s.direction_influence_ = std::clamp(j.value("direction_influence_", 0.f), 0.f, 1.f);
	s.burst_count_ = std::max(1u, j.value("burst_count_", 1u));

	if (j.contains("particle_setting_"))
		j.at("particle_setting_").get_to(s.particle_setting_);

	if (j.contains("emitter_spec_"))
		j.at("emitter_spec_").get_to(s.emitter_spec_);

	if (s.emitter_spec_.particle_setting_id_ == 0)
		s.emitter_spec_.particle_setting_id_ = s.particle_setting_.id_;

	if (s.emitter_spec_.emit_interval_sec_ <= 0.f)
		s.emitter_spec_.emit_interval_sec_ = 0.03f;

	if (s.emitter_spec_.emit_count_per_tick_ == 0)
		s.emitter_spec_.emit_count_per_tick_ = std::max(1u, s.burst_count_);

	if (s.emitter_spec_.duration_sec_ < 0.f)
		s.emitter_spec_.duration_sec_ = 0.f;
}

inline void to_json(nlohmann::json& j, const ParticleEventSet& s)
{
	j = nlohmann::json{
		{"id_", s.id_},
		{"name_", _UtilFunc::ToString(s.name_)},
		{"events_", s.events_}
	};
}

inline void from_json(const nlohmann::json& j, ParticleEventSet& s)
{
	j.at("id_").get_to(s.id_);
	s.name_ = ParticleEventSetJson::ReadWString(j, "name_", L"Particle Event Set");

	if (j.contains("events_"))
		j.at("events_").get_to(s.events_);
	else
		s.events_.clear();
}
