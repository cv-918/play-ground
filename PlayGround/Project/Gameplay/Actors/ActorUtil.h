#pragma once

#include <string>
#include <Base/Bases.h>
#include "ActorTypes.h"

namespace ActorUtil
{
	inline const std::wstring GetPlayerStateName(PlayerState _state)
	{
		switch (_state)
		{
		case PlayerState::Idle: return L"idle";
		case PlayerState::Move: return L"move";
		case PlayerState::Attack: return L"attack";
		case PlayerState::Spell: return L"spell";
		case PlayerState::Hit: return L"hit";
		case PlayerState::Death: return L"death";
		default:
			return L"unknown";
		}
	}
}