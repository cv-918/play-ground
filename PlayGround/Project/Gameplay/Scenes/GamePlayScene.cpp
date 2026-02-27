#include "framework.h"
#include "GamePlayScene.h"

#include "Actors/GameObjectBase.h"
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
	stage_manager_ = &_StageMgr.Get();

	const auto background = new Background();
	AddGameObject(background);

	const auto player = new Player();
	AddGameObject(player);

	const auto& nav_mesh = background->NavMesh();
	player->SetNavMesh(nav_mesh);
	stage_manager_->SetNavMesh(nav_mesh);
	stage_manager_->SetObjectManager(object_manager_);

	_GameState.Player(player);

	MAKE_INITIALIZED;
	return _bool();
}

_int GamePlayScene::Update(_double _delta_time)
{
	__super::Update(_delta_time);

	// 스테이지 매니저 업데이트
	stage_manager_->Update(_delta_time);

	return _int();
}

void GamePlayScene::OnEnter()
{
}

void GamePlayScene::OnExit()
{
}
