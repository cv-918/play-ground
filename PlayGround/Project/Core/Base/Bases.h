#pragma once

enum class ComponentType
{
	Undefined,
	Transform,
	Status,
	Movement,
	Collider,
	Combat,
};

enum class CollisionLayer
{
	PlayerBody,
	PlayerAttack,
	ExpDust,
	Bullet,
	Wall,
	End
};

enum class SceneType
{
	Intro,
	Loading,
	Lobby,
	GamePlay,
	Count,
};