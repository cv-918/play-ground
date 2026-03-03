#include "framework.h"
#include "ExpDust.h"

_bool ExpDust::Initialize()
{
	if (!__super::Initialize())
		return false;

	// 더스트 identifier 설정
	static _int instance_count = 0;
	Name(_T("Enemy") + std::to_wstring(++instance_count));

	// 컴포넌트 설정
	// 무브먼트 컴포넌트 설정에 필요한 값
	MovementPattern pattern = MovementPattern::Undefined;
	_float move_spd = 0.f;

	// 트랜스폼 컴포넌트 설정에 필요한 값
	_float scale = 0.f;
	_Vector3 position;
	_Vector3 look_point;

	// 콜라이더 컴포넌트 설정에 필요한 값
	_bool collidable = false;

	// 스테이터스 컴포넌트 설정에 필요한 값
	_int hp = 0;

	switch (info_.grade_)
	{
	case EnemyGrade::Common:
		// 일반 | 자원 공급용1
		pattern = MovementPattern::Directional;
		move_spd = 40.f;

		scale = 10.f;
		color_ = Colors::Pearl;

		hp = 1;
		break;
	case EnemyGrade::UnCommon:
		// 중급 | 자원 공급용2 | 이동 속도 빠름
		pattern = MovementPattern::Directional;
		move_spd = 80.f;

		scale = 10.f;
		color_ = Colors::LightPink;

		hp = 1;
		break;
	case EnemyGrade::Danger:
		// 위험 | 플레이 흐름 변화 유도 | 충돌 데미지 있음
		pattern = MovementPattern::Directional;
		move_spd = 60.f;

		scale = 30.f;
		collidable = true;
		color_ = Colors::Pink;

		hp = 3;
		break;
	case EnemyGrade::Special:
		// 특수 | 플레이 흐름 변화 유도 | 역할군 부여받음
		pattern = MovementPattern::Directional;
		move_spd = 40.f;

		scale = 50.f;
		collidable = true;
		color_ = Colors::Salmon;

		hp = 5;
		info_.role_ = s_cast(EnemyRole, _Random.Range(s_int(EnemyRole::Tanky), s_int(EnemyRole::Count) - 1));
		break;
	default:
		// 로깅
		break;
	}

	const _int radius = (s_int(scale) >> 1);

	switch (pattern)
	{
	case MovementPattern::Directional:
	case MovementPattern::Target:
	{
		// 스테이지가 진행 중일 경우 초기 위치를 화면 밖으로 한정해야 한다
		// 만약, 위치가 화면 안에 있을 경우 화면 중점에 대한 방향벡터를 구하고 반대 방향으로 밀어낸다

		const _Vector3 generated_position = _StageMgr.GeneratePosition(StageState::Ready == _StageMgr.State());
		const _Vector3 center = _Vector3(WIN_CENTER_X, WIN_CENTER_Y);
		const _Vector3 to_center = (center - generated_position).Normalized();

		position = generated_position + (to_center * radius);

		const auto& nav_mesh = _StageMgr.GetNavMesh(); // 네비 메시를 태우는건 아니고 범위만 사용한다
		if (nav_mesh.PtInRect(position))
		{
			position += to_center * (radius * -1.f);
		}

		// 네비 메시의 영역보다 작은(3/4) 영역 내부의 임의의 위치를 바라보도록 설정
		const auto& look_target_area = nav_mesh * 0.75f;
		look_point = { _Random.Range(look_target_area.Left(), look_target_area.Right()),
			_Random.Range(look_target_area.Top(), look_target_area.Bottom()) };
	}
	break;
	}

	/*
		#1. 초기 SRT(Scale, Rotation, Translation) 설정
		- 트랜스폼 및 무브먼트 컴포넌트에 대한 설정

		* 크기 : 레벨 분기
		* 위치 : 이동 타입(레벨에 의해 분기)에 따라
				 -> Stopped 인 경우 무조건 화면 내부에 생성해야함
				 -> Directional | ToTarget 일 경우 스폰 가능한 전체 영역
				 -> 스테이지 이동에 의한 초기 생성인지 스테이지 진행 중의 지속 생성인지에 따라서 스폰 영역 변경되어야 함
				 
		* 회전 : 레벨(이동 타입) 및 초기 생성 위치에 따라서
	*/

	transform_->Scale(scale);
	transform_->Position(position);
	transform_->LookAt(look_point);
	
	const auto body_collider = GetDefaultCollider(UnitDefaultColliderId::Body);
	body_collider->Radius(radius);
	body_collider->Draw(true);

	const auto attack_collider = GetDefaultCollider(UnitDefaultColliderId::Attack);
	attack_collider->Radius(radius);
	attack_collider->Draw(true);

	_ColMgr.RegisterCollider(CollisionLayer::EnemyBody, body_collider);

	if (collidable)
	{
		_ColMgr.RegisterCollider(CollisionLayer::EnemyAttack, attack_collider);
	}
	else
	{
		attack_collider->InActivate();
	}	

	movement_->Pattern(pattern);
	movement_->MoveSpd(move_spd);
	movement_->MoveDir((look_point - position).Normalized());

	/*
		#2. 공격 패턴 설정
		- 컴뱃 및 스테이터스 컴포넌트에 대한 설정
		공격 패턴이 있는 레벨의 경우 공격 패턴 설정
	*/

	status_->Level(s_int(info_.grade_));
	status_->HP(hp);

	object_description_ = _T("Lv. ") + std::to_wstring(status_->Level());

	// 역할군을 부여받았을 경우 해당 정보까지 description 에 추가
	if (info_.role_ != EnemyRole::Count)
	{
		std::vector<std::wstring> role_strings = {
			_T("Tanky | 높은 체력"),
			_T("HighLoot | 많은 자원"),
			_T("Ranger | 공격-투사체-"),
			_T("Mutant | 분열/강화"),
		};

		object_description_ += _T("\n");
		object_description_ += role_strings[s_int(info_.role_)];
	}

	Finalize();
	return true;
}

_int ExpDust::Update(_double _delta_time)
{
	_int ret = __super::Update(_delta_time);
	if (0 != ret) return ret;

	return 0;
}

void ExpDust::OnDestroy()
{
	const auto body_collider = GetDefaultCollider(UnitDefaultColliderId::Body);
	const auto attack_collider = GetDefaultCollider(UnitDefaultColliderId::Attack);

	_ColMgr.DeregisterCollider(CollisionLayer::EnemyBody, body_collider);
	_ColMgr.DeregisterCollider(CollisionLayer::EnemyAttack, attack_collider);
}

void ExpDust::OnCollisionEnter(Collider* _this, Collider* _other)
{
	switch (_other->Layer())
	{
	case CollisionLayer::PlayerBody:
	{
		switch (info_.grade_)
		{
		case EnemyGrade::Danger:
		case EnemyGrade::Special:
		{
			// 더스트의 IDamagable 핸들러 시스템에 메시지 보내서 데미지 입히기
			_other->GameObject()->SendMessageToHandlers(HandlerSystemList::Damage, [](IHandler* _handler) {
				s_cast(IDamagable*, _handler)->GetDamage(1.f);
				});

			// 공격 쿨타임 동안은 같은 더스트에 대해서는 충돌이 일어나지 않도록 타이머 설정
			// 공격속도 고정값 일단은 여기에 지역변수로 하드코딩
			const _double attack_cooltime = 4.f;
			_this->SetTimerForTarget(_other, attack_cooltime);
		}
		break;
		}
	}
	break;
	}
}

void ExpDust::OnCollisionStay(Collider* _this, Collider* _other)
{
}

void ExpDust::OnCollisionExit(Collider* _this, Collider* _other)
{
}

void ExpDust::GetDamage(_float _damage)
{
	combat_->GetDamage(_damage, status_);
}
