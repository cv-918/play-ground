#pragma once

enum class ActorType
{
	TownPlayer,
	StagePlayer,
	TownNPC,
	StageEnemy,
	Projectile,
	InteractableObject,
	Effect,
	Other,
};

enum class PlayerState
{
	Idle,
	Move,
	Attack,
	Spell,
	Hit,
	Death,
};