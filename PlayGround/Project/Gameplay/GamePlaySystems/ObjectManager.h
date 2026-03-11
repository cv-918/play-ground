#pragma once

class GameObjectBase;

/*
	게임 내에서 다양한 게임 오브젝트를 관리하는 시스템 클래스
	특정 씬에 속하며, 해당 씬에서 생성되고 업데이트되는 게임 오브젝트들을 관리
*/

class ObjectManager
	: public IInitializable
	, public IUpdatable
	, public IReleasable
{
public:
	virtual ~ObjectManager();

public:
	_int Update(_double _delta_time) override;
	_int LateUpdate(_double _delta_time) override;
	void Render(_double _delta_time) override;

	_bool Release() override;

public:
	// 게임 오브젝트 관리를 위한 메서드. 필요에 따라 게임 오브젝트를 추가, 제거, 검색하는 기능을 구현할 수 있습니다.
	void AddGameObject(GameObjectBase* _game_object);

	// 템플릿 메서드를 사용하여 다양한 타입의 게임 오브젝트를 생성할 수 있도록 지원
	// 단, 몬스터 생성 메서드, 오브젝트 생성 메서드 등을 구분하고 인자로는 해당 타입의 정보를 받는다
	GameObjectBase* SpawnEnemy(const EnemyJsonInfo* _info);
	GameObjectBase* SpawnProjectile(GameObjectBase* _owner, const _Point& _position,
                                     const _Point& _target, _float _damage, _float _speed);

	// 게임 오브젝트가 존재할 수 있는 영역을 생성하는 메서드. 예를 들어, 네비게이션 메시의 영역에서 일정 마진을 둔 영역을 계산하여 play_area_에 저장할 수 있습니다. 필요에 따라 몬스터나 오브젝트가 생성될 수 있는 영역을 동적으로 계산하여 관리할 수 있도록 구현할 수 있습니다.
	void GeneratePlayArea(const _Rect& _nav_mesh_rect, const _int margin);

private:
	// 오브젝트 추가 경로 통제하기 위한 메서드
	void _PushGameObject(GameObjectBase* _game_object);

	// Update 루프 안에서 생성, 파괴된 게임 오브젝트를 일괄 관리하는 메서드
	void _MergeNewGameObjects();
	void _RemoveDestroyedGameObjects();

private:
	std::vector<GameObjectBase*> game_objects_;
	std::vector<GameObjectBase*> new_game_objects_; // 업데이트 중에 추가된 게임 오브젝트들을 임시로 저장하는 컨테이너. 업데이트가 시작 전에 game_objects_에 병합하여 관리

	_Rect* play_area_ = nullptr; // 몬스터나 오브젝트가 존재할 수 있는 영역
};
