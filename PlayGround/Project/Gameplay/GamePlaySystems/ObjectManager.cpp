#include "framework.h"
#include "ObjectManager.h"

#include "Actors/GameObjectBase.h"
#include "Actors/ExpDust.h"

_int ObjectManager::Update(_double _delta_time)
{
	for (auto* game_object : game_objects_)
	{
		if (game_object->IsActive())
			game_object->Update(_delta_time);
	}

	return UPDATE_CONTINUE;
}

_int ObjectManager::LateUpdate(_double _delta_time)
{
	for (auto* game_object : game_objects_)
	{
		if (game_object->IsActive())
			game_object->LateUpdate(_delta_time);
	}

	_CleanUp();

	return UPDATE_CONTINUE;
}

void ObjectManager::Render(_double _delta_time)
{
	for (auto* game_object : game_objects_)
	{
		if (game_object->IsActive())
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

	return true;
}

void ObjectManager::AddGameObject(GameObjectBase* _game_object)
{
	const auto it = std::find(game_objects_.begin(), game_objects_.end(), _game_object);

	// 이미 존재하는 게임 오브젝트는 추가하지 않음
	if (it != game_objects_.end())
		return;

	// 게임 오브젝트를 추가
	if (false == _game_object->IsInitialized())
		_game_object->Initialize();

	game_objects_.push_back(_game_object);
}

GameObjectBase* ObjectManager::SpawnEnemy(const EnemyJsonInfo* _info)
{
	GameObjectBase* enemy = nullptr;

	// EnemyJsonInfo의 category_ 필드에 따라 적의 타입을 결정하고, 해당 타입에 맞는 객체를 생성하도록 함
	// 각 적 타입에	대한 생성 로직에서는 EnemyJsonInfo의 grade_ 필드를 활용하여 적의 등급에 따른 특성 설정도 함께 처리하도록 함
	switch (_info->category_) // 각 적 타입에 대한 생성 로직은 별도의 함수로 분리하여 관리할 수도 있지만, 현재는 간단한 switch문으로 처리하도록 함
	{
	case EnemyCategory::WasExpDust:
		enemy = new ExpDust(_info);
		break;
	}

	// 카테고리에 의해 객체가 생성되지 않았거나, 생성된 객체가 nullptr인 경우 nullptr 반환
	if (nullptr == enemy)
		return nullptr;

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
	auto it = std::remove_if(game_objects_.begin(), game_objects_.end(),
		[](GameObjectBase* obj) {
			if (obj->IsDestroyed())
			{
				// 파괴되는 오브젝트의 이름 로깅
				_SYSTEM_LOG_INFO(L"ObjectManager: Destroying game object - Name: %s, ID: %d", obj->Name().c_str(), obj->ID());

				// 파괴 시 필요한 로직 수행 후 메모리 해제
				obj->OnDestroy();
				delete obj;

				return true;
			}
			return false;
		});

	game_objects_.erase(it, game_objects_.end());
}
