#include "framework.h"
#include "GamePlayScene.h"

#include "Actors/Player.h"
#include "Actors/ExpDust.h"
#include "Components/Transform.h"
#include "GamePlay/World/Background.h"

#include "GamePlaySystems/GameState.h"
#include "GamePlaySystems/StageManager.h"

_bool GamePlayScene::Initialize()
{
	__super::Initialize();

	debug_scene_name_ = L"GAMEPLAY SCENE";

	const auto background = new Background();
	AddGameObject(background);

	const auto player = new Player();
	AddGameObject(player);

	const auto& nav_mesh = background->NavMesh();
	player->SetNavMesh(nav_mesh);
	_StageMgr.SetNavMesh(nav_mesh);

	_GameState.Player(player);

	MAKE_INITIALIZED;
	return _bool();
}

_int GamePlayScene::Update(_double _delta_time)
{
	__super::Update(_delta_time);

	if (_InputMgr.Down(VK_SPACE))
	{
		auto mouse_point = _InputMgr.MousePoint();

		// 여기서 ExpDust 생성
		GameObjectBase* new_dust = new ExpDust();
		new_dust->Initialize();

		const auto transform = new_dust->GetTransform();
		transform->Position(mouse_point.x, mouse_point.y);

		const auto radius = _Random.Range(15.f, 50.f);
		transform->Scale(radius, radius);
		s_cast(ExpDust*, new_dust)->AdjustColliderRadius();

		AddGameObject(new_dust);
	}
	return _int();
}

void GamePlayScene::OnEnter()
{
}

void GamePlayScene::OnExit()
{
}
