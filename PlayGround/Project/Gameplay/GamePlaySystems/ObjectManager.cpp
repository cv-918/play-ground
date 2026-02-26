#include "framework.h"
#include "ObjectManager.h"

#include "Actors/GameObjectBase.h"
#include "Actors/ExpDust.h"

_bool ObjectManager::Initialize()
{
	return _bool();
}

_int ObjectManager::Update(_double _delta_time)
{
	for (auto* game_object : game_objects_)
	{
		if (game_object->Active())
			game_object->Update(_delta_time);
	}

	return _int();
}

_int ObjectManager::LateUpdate(_double _delta_time)
{
	for (auto* game_object : game_objects_)
	{
		if (game_object->Active())
			game_object->LateUpdate(_delta_time);
	}

	return _int();
}

void ObjectManager::Render(_double _delta_time)
{
	for (auto* game_object : game_objects_)
	{
		if (game_object->Active())
		{
			game_object->Render(_delta_time);
			game_object->DebugRender(_delta_time);
		}
	}
}

_bool ObjectManager::Release()
{
	for (auto* game_object : game_objects_)
	{
		if (game_object)
		{
			game_object->Release();
			delete game_object;
		}
	}
	std::vector<GameObjectBase*>().swap(game_objects_);

	return _bool();
}

void ObjectManager::AddGameObject(GameObjectBase* _game_object)
{
	const auto it = std::find(game_objects_.begin(), game_objects_.end(), _game_object);

	// 이미 존재하는 게임 오브젝트는 추가하지 않음
	if (it != game_objects_.end())
		return;

	// 게임 오브젝트를 추가
	if(false == _game_object->IsInitialized())
		_game_object->Initialize();

	game_objects_.push_back(_game_object);
}

GameObjectBase* ObjectManager::SpawnEnemy(const EnemyInfo& _info)
{
	GameObjectBase* enemy = nullptr;
	switch (_info.category_)
	{
	case EnemyCategory::WasExpDust:
		enemy = new ExpDust(_info);
		break;
	default:
		return nullptr; // 지원하지 않는 카테고리인 경우 nullptr 반환
	}

	if (enemy->Initialize())
	{
		game_objects_.push_back(enemy);
		return enemy;
	}

	SAFE_DELETE(enemy);
	return nullptr;
}
