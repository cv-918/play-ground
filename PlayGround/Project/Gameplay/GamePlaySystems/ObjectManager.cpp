#include "framework.h"
#include "ObjectManager.h"

#include "Actors/GameObjectBase.h"
#include "Actors/ExpDust.h"
#include "Actors/Projectile/Bullet.h"

ObjectManager::~ObjectManager()
{
	for (auto* game_object : game_objects_)
		SAFE_DELETE(game_object);

	for (auto* new_obj : new_game_objects_)
		SAFE_DELETE(new_obj);

	SAFE_DELETE(play_area_);
}

_int ObjectManager::Update(_double _delta_time)
{
	_MergeNewGameObjects();

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
		{
			game_object->LateUpdate(_delta_time);

			if (play_area_)
			{
				// 게임 오브젝트가 플레이 영역 밖으로 나갔는지 확인
				const _Point obj_pos = game_object->GetTransform()->Position();
				if (!play_area_->PtInRect(obj_pos))
				{
					_SYSTEM_LOG_INFO(L"ObjectManager: Game object out of play area - Name: %s, ID: %d, Position: (%.2f, %.2f)", game_object->Name().c_str(), game_object->ID(), obj_pos.x, obj_pos.y);
					game_object->ReserveDestruction(); // 플레이 영역 밖으로 나간 오브젝트는 파괴 처리
				}
			}
		}
	}

	_RemoveDestroyedGameObjects();

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

void ObjectManager::AddGameObject(GameObjectBase* _game_object)
{
	if (nullptr == _game_object)
	{
		_SYSTEM_LOG_ERROR(L"ObjectManager::AddGameObject - Attempted to add a null game object.");
		return;
	}

	const auto it = std::find(game_objects_.begin(), game_objects_.end(), _game_object);

	// 이미 존재하는 게임 오브젝트는 추가하지 않음
	if (it != game_objects_.end())
		return;

	// 게임 오브젝트를 추가
	if (false == _game_object->IsInitialized())
		_game_object->Initialize();

	_PushGameObject(_game_object);
}

GameObjectBase* ObjectManager::SpawnEnemy(const EnemyJsonInfo* _info)
{
	if (nullptr == _info)
	{
		_SYSTEM_LOG_ERROR(L"ObjectManager::SpawnEnemy - Invalid EnemyJsonInfo pointer.");
		return nullptr;
	}

	// EnemyCategory를 삭제했기 때문에 우선은 ExpDust로 고정해서 생성. 나중에 EnemyCategory와 같은 값이 다시 생긴다면 그에 맞춰서 생성 로직 추가
	GameObjectBase* enemy = new ExpDust(_info);

	// 카테고리에 의해 객체가 생성되지 않았거나, 생성된 객체가 nullptr인 경우 nullptr 반환
	if (nullptr == enemy)
		return nullptr;

	if (enemy->Initialize())
	{
		_PushGameObject(enemy);
		return enemy;
	}

	SAFE_DELETE(enemy);
	return nullptr;
}

GameObjectBase* ObjectManager::SpawnProjectile(GameObjectBase* _owner, const _Point& _position,
                                                const _Point& _target, _float _damage, _float _speed)
{
	GameObjectBase* bullet = new Bullet(_owner, _damage, _speed);
    
    if (bullet->Initialize())
    {
        bullet->GetTransform()->Position(_position);
        bullet->GetTransform()->LookAt(_target);
        
		_PushGameObject(bullet);
		_SYSTEM_LOG_INFO(L"Spawned projectile - Name: %s", bullet->Name().c_str());
        return bullet;
    }
    
    SAFE_DELETE(bullet);
    return nullptr;
}

void ObjectManager::GeneratePlayArea(const _Rect& _nav_mesh_rect, const _int margin)
{
	SAFE_DELETE(play_area_);

	// 네비게이션 메시의 영역에서 일정 마진을 둔 영역 계산
	const _Rect play_area_rect(
		_nav_mesh_rect.Left() - margin,
		_nav_mesh_rect.Top() - margin,
		_nav_mesh_rect.Right() + margin,
		_nav_mesh_rect.Bottom() + margin
	);
	play_area_ = new _Rect(play_area_rect);
}

void ObjectManager::_PushGameObject(GameObjectBase* _game_object)
{
	if (_game_object == nullptr)
	{
		_SYSTEM_LOG_ERROR(L"ObjectManager::_PushGameObject - Attempted to push a null game object.");
		return;
	}

	new_game_objects_.push_back(_game_object);
	_SYSTEM_LOG_INFO(L"ObjectManager: Added game object - Name: %s, ID: %d", _game_object->Name().c_str(), _game_object->ID());
}

void ObjectManager::_MergeNewGameObjects()
{
	if (new_game_objects_.empty())
		return;

	for (auto* new_obj : new_game_objects_)
	{
		static _uint object_count = 0;
		new_obj->ID(object_count++);
		game_objects_.push_back(new_obj);
		_SYSTEM_LOG_INFO(L"ObjectManager: Merged new game object - Name: %s, ID: %d", new_obj->Name().c_str(), new_obj->ID());
	}
	std::vector<GameObjectBase*>().swap(new_game_objects_);
}

void ObjectManager::_RemoveDestroyedGameObjects()
{
	if (game_objects_.empty())
		return;

	// 이터레이터를 이용해 IsDestroyed()가 true인 것들만 골라 지우기
	auto it = std::remove_if(game_objects_.begin(), game_objects_.end(),
		[](GameObjectBase* obj) {
			if (obj->IsPendingDestruction())
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
