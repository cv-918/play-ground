#include "framework.h"
#include "ObjectManager.h"

#include "Actors/GameObjectBase.h"
#include "Actors/ExpDust.h"
#include "Actors/Projectile/Bullet.h"

ObjectManager::~ObjectManager()
{
	for (auto& game_object : game_objects_)
		SAFE_DELETE(game_object);

	for (auto& new_obj : new_game_objects_)
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
				static _uint frame_count = 0;
				++frame_count;

				// 매 10프레임마다 게임 오브젝트의 위치를 체크하여 플레이 영역 밖으로 나간 오브젝트를 파괴 처리
				if (frame_count % 10 == 0)
				{
					// 프레임 카운트가 너무 커지는 것을 방지하기 위해 일정 값 이상이 되면 초기화
					frame_count = 0;

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
	}

	CleanUp();

	return UPDATE_CONTINUE;
}

void ObjectManager::Render(_double _delta_time)
{
	for (auto* game_object : game_objects_)
	{
		if (game_object->IsActive() && !game_object->IsPendingDestruction())
		{
			game_object->Render(_delta_time);
			game_object->DebugRender(_delta_time);
		}
	}
}

void ObjectManager::CleanUp()
{
	if (game_objects_.empty()) return;

	// 1. partition을 사용하면 조건을 만족하는(삭제할) 대상들을 뒤로 모아줍니다.
	// remove_if와 달리 요소의 값을 덮어쓰지 않고 '교체(swap)'하므로 포인터가 안전합니다.
	auto it = std::partition(game_objects_.begin(), game_objects_.end(),
		[](GameObjectBase* obj) {
			return !obj->IsPendingDestruction(); // 살아남을 대상을 앞쪽으로
		});

	if (game_objects_.end() == it)
		return;

	// 2. it부터 end()까지는 이제 확실하게 '삭제 대기 중인 객체들'만 모여있습니다.
	for (auto temp_it = it; temp_it != game_objects_.end(); ++temp_it)
	{
		(*temp_it)->OnDestroy();
		delete (*temp_it);
	}

	// 3. 컨테이너에서 제거
	game_objects_.erase(it, game_objects_.end());
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
	//_SYSTEM_LOG_INFO(L"ObjectManager: Added game object - Name: %s, ID: %d", _game_object->Name().c_str(), _game_object->ID());
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
		//_SYSTEM_LOG_INFO(L"ObjectManager: Merged new game object - Name: %s, ID: %d", new_obj->Name().c_str(), new_obj->ID());
	}
	std::vector<GameObjectBase*>().swap(new_game_objects_);
}
