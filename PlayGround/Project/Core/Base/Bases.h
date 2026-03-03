#pragma once

enum class CollisionLayer
{
	PlayerBody,
	PlayerAttack,
	EnemyBody,
	EnemyAttack,
	EnemyBullet,
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