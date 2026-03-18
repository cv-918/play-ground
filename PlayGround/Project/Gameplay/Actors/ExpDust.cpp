#include "framework.h"
#include "ExpDust.h"

_bool ExpDust::Initialize()
{
	if (!__super::Initialize())
		return false;

	// 더스트 identifier 설정
	static _int instance_count = 0;
	Name(_UtilFunc::ToWString(info_->name_) + std::to_wstring(++instance_count));

	// 컴포넌트 설정

	// 트랜스폼 컴포넌트 설정에 필요한 값
	_Vector3 position;
	_Vector3 look_point;

	switch (info_->tier_)
	{
	case EnemyTier::Normal:
		// 일반 | 자원 공급용1
		color_ = Colors::Pearl;
		break;
	case EnemyTier::Elite:
		// 중급 | 자원 공급용2 | 이동 속도 빠름
		color_ = Colors::LightPink;
		break;
	case EnemyTier::Danger:
		// 위험 | 플레이 흐름 변화 유도 | 충돌 데미지 있음
		color_ = Colors::Pink;
		break;
	case EnemyTier::Special:
		// 특수 | 플레이 흐름 변화 유도 | 역할군 부여받음
		color_ = Colors::Salmon;
		break;
	default:
		// 로깅
		break;
	}

	const auto radius = info_->body_size_ * 0.5f;

	switch (info_->movement_pattern_)
	{
	case MovementPattern::Directional:
	case MovementPattern::Target:
	{
		// 스테이지가 진행 중일 경우 초기 위치를 화면 밖으로 한정해야 한다
		// 만약, 위치가 화면 안에 있을 경우 화면 중점에 대한 방향벡터를 구하고 반대 방향으로 밀어낸다

		const _Vector3 generated_position = _StageMgr.GeneratePosition(StageState::Ready == _StageMgr.GetCurrState());
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

	transform_->Scale(info_->body_size_);
	transform_->Position(position);
	transform_->LookAt(look_point);
	
	const auto body_collider = GetDefaultCollider(UnitDefaultColliderId::Body);
	body_collider->Radius(radius);
	body_collider->SetVisible(true);

	const auto attack_collider = GetDefaultCollider(UnitDefaultColliderId::Attack);
	attack_collider->Radius(radius);
	attack_collider->SetVisible(true);

	_ColMgr.RegisterCollider(CollisionLayer::EnemyBody, body_collider);

	if (info_->contact_damage_ > 0.f)
	{
		_ColMgr.RegisterCollider(CollisionLayer::EnemyAttack, attack_collider);
	}
	else
	{
		attack_collider->InActivate();
	}	

	movement_->Pattern(info_->movement_pattern_);
	movement_->MoveSpd(info_->move_speed_unit_ * ENEMY_DEFAULT_MOVE_SPEED_MULTIPLIER);
	movement_->MoveDir((look_point - position).Normalized());

	/*
		#2. 공격 패턴 설정
		- 컴뱃 및 스테이터스 컴포넌트에 대한 설정
		공격 패턴이 있는 레벨의 경우 공격 패턴 설정
	*/

	const auto lv = s_int(info_->tier_);
	status_->SetLv(lv);
	status_->SetCurrentHp(info_->hp_);
	status_->SetMaxHP(info_->hp_);
	status_->SetAtt(info_->contact_damage_);

	object_description_ = _T("Lv. ") + std::to_wstring(lv);

	Finalize();
	return true;
}

_int ExpDust::Update(_double _delta_time)
{
	_int ret = __super::Update(_delta_time);
	if (0 != ret) return ret;
	
	return UPDATE_CONTINUE;
}

void ExpDust::OnDestroy()
{
	const auto body_collider = GetDefaultCollider(UnitDefaultColliderId::Body);
	const auto attack_collider = GetDefaultCollider(UnitDefaultColliderId::Attack);

	_ColMgr.DeregisterCollider(CollisionLayer::EnemyBody, body_collider);
	_ColMgr.DeregisterCollider(CollisionLayer::EnemyAttack, attack_collider);

	if (status_->IsDead())
	{
		_RunState.IncreaseEarnedCoinCount(info_->reward_);

		// 코인 획득 텍스트 ui 노출(선택)
		// play_scene_->ShowCoinEarnedUI(info_->reward_, transform_->Position());
	}
}

void ExpDust::OnCollisionEnter(Collider* _this, Collider* _other)
{
	switch (_other->Layer())
	{
	case CollisionLayer::PlayerBody:
	{
		switch (info_->tier_)
		{
		case EnemyTier::Danger:
		case EnemyTier::Special:
		{
			_other->GameObject()->SendMessageToHandlers(HandlerSystemList::Damage, [this](IHandler* _handler) {
				s_cast(IDamagable*, _handler)->GetDamage(status_->GetAtt());
				});

			_this->SetTimerForTarget(_other, DEFAULT_ATTACK_SPEED - info_->attack_speed_);
		}
		break;
		}
	}
	break;
	}
}

void ExpDust::OnCollisionStay(Collider* _this, Collider* _other)
{
	switch (_other->Layer())
	{
	case CollisionLayer::PlayerBody:
	{
		switch (info_->tier_)
		{
		case EnemyTier::Danger:
		case EnemyTier::Special:
		{
			_other->GameObject()->SendMessageToHandlers(HandlerSystemList::Damage, [this](IHandler* _handler) {
				s_cast(IDamagable*, _handler)->GetDamage(status_->GetAtt());
			});

			_this->SetTimerForTarget(_other, DEFAULT_ATTACK_SPEED - info_->attack_speed_);
		}
		break;
		}
	}
	break;
	}
}

void ExpDust::GetDamage(_float _damage)
{
	const auto final_damage = combat_->GetDamage(_damage);

	// 데미지 폰트 출력
	const auto position = transform_->Position();
	play_scene_->ShowDamageUI(final_damage, _Point{ position.x, position.y });
}
