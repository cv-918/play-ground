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

	_CleanUp();

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

GameObjectBase* ObjectManager::SpawnEnemy(_int _category, _int _grade)
{
	GameObjectBase* enemy = nullptr;
	EnemyJsonInfo info = EnemyJsonInfo(s_cast(EnemyCategory, _category), s_cast(EnemyGrade, _grade), EnemyRole::Count);
	switch (s_cast(EnemyCategory, _category))
	{
	case EnemyCategory::WasExpDust:
		enemy = new ExpDust(info);
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

void ObjectManager::_CleanUp()
{
	if (game_objects_.empty())
		return;

	// 이터레이터를 이용해 IsDestroyed()가 true인 것들만 골라 지우기
	// std::remove_if는 아주 효율적인 알고리즘입니다.
	auto it = std::remove_if(game_objects_.begin(), game_objects_.end(),
		[](GameObjectBase* obj) {
			if (obj->IsDestroyed())
			{
				obj->OnDestroy(); // 파괴 시 필요한 로직 수행
				delete obj; // 메모리 해제
				return true; // 리스트에서 제거 대상
			}
			return false;
		});

	game_objects_.erase(it, game_objects_.end());
}
