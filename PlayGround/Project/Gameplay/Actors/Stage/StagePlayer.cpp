#include "framework.h"
#include "StagePlayer.h"

#include "Components/PlayerMovement.h"
#include "GamePlaySystems/SkillManager.h"

#include "GamePlaySystems/Json/ParticleDataManager.h"

_bool StagePlayer::Initialize()
{
	if (!__super::Initialize())
		return false;

	// 플레이어 identifier 설정
	Name(_UtilFunc::ToWString(info_->name_));

	// 플레이어 Movement 컴포넌트 생성 및 등록
	movement_ = new PlayerMovement(info_);
	RegisterComponent(movement_);

	// 플레이어 컴포넌트 설정
	const auto attribute_stat = _UserProfile.GetAttributeStat();

	//transform_->Rotation(0, 1);
	transform_->Scale(info_->body_size_);

	const auto start_hp = attribute_stat.GetStat(AttributeType::Hp).GetTotalIncrease(info_->hp_);
	status_->SetCurrentHp(start_hp);
	status_->SetMaxHP(start_hp);

	const auto start_att = attribute_stat.GetStat(AttributeType::Attack).GetTotalIncrease(info_->contact_damage_);
	status_->SetAtt(start_att);

	// 플레이어 콜라이더 설정
	const auto body_col = GetDefaultCollider(UnitDefaultColliderId::Body);
	body_col->SetRadius(info_->body_size_); // 플레이어의 몸통 콜라이더는 플레이어 크기에 비례해서 설정
	_ColMgr.RegisterCollider(CollisionLayer::PlayerBody, body_col);

	const auto attack_col = GetDefaultCollider(UnitDefaultColliderId::Attack);
	const auto start_attack_radius = attribute_stat.GetStat(AttributeType::AttackRange).GetTotalIncrease(info_->attack_range_); // 공격 범위는 플레이어 크기에 비례해서 설정
	attack_col->SetRadius(start_attack_radius);
	attack_col->SetDebugColor(Palette::Gray, Palette::Maroon, COLLIDER_DEBUG_COLOR_ATTACK);
	attack_col->SetDrawAlways(false);
	_ColMgr.RegisterCollider(CollisionLayer::PlayerAttack, attack_col);

	const auto start_collector_size = attribute_stat.GetStat(AttributeType::CollectionRange).GetTotalIncrease(info_->collector_size_); // 수집 콜라이더는 플레이어 크기에 비례해서 설정
	collector_col_ = new EllipseCollider(start_collector_size); // 수집 콜라이더는 플레이어 크기에 비례해서 설정
	collector_col_->SetDebugColor(Palette::Gray, Palette::AshGray, Palette::Charcoal);
	collector_col_->SetDrawAlways(false);
	RegisterComponent(collector_col_);
	_ColMgr.RegisterCollider(CollisionLayer::PlayerCollector, collector_col_);

	// 기타 멤버 변수 초기화 및 캐싱
	color_ = Palette::DarkGray;
	input_manager_ = &_InputMgr.Get();
	skill_manager_ = &_SkillMgr.Get();

	Finalize();
	return true;
}

_int StagePlayer::Update(_double _delta_time)
{
	auto ret = __super::Update(_delta_time);
	if (ret != UPDATE_CONTINUE)
		return ret;

	if (input_manager_->Down(VK_CONTROL))
	{
		skill_manager_->UseSkill(0, this, transform_->Forward2D());
		_SYSTEM_LOG_INFO(L"Player used skill 0");
	}
	if (input_manager_->Down(VK_MENU))
	{
		skill_manager_->UseSkill(1, this, transform_->Forward2D());
		_SYSTEM_LOG_INFO(L"Player used skill 0");
	}

	//const auto move_vel = movement_->MoveVelocity();
	//if (0 < move_vel.Magnitude())
	//{
	//	_Vector3 test;
	//	test.operator _Vector2() = move_vel;

	//	const auto pos = transform_->Position();
	//	const auto vel = _Vector2{ _Random.Range(-10.f, 10.f), _Random.Range(-5.f, 5.f) };

	//	ParticleSetting setting;
	//	_ParticleService.Emit(setting, pos, 1);
	//}

	if (input_manager_->Down(VK_LBUTTON))
	{
		const auto mouse_pt = input_manager_->MousePoint();
		const auto data = _ParticleDataMgr.GetDataByIndex(2);
		_ParticleService.Emit(*data, mouse_pt, 10); // 한 번에 10개 생성

		//ParticleSetting testSetting;
		//testSetting.shape = EmitterShape::Circle;
		//testSetting.shapeRadius = 10.f;
		//testSetting.minLife = 1.0f;
		//testSetting.maxLife = 2.0f;
		//testSetting.minSpeed = 100.f;
		//testSetting.maxSpeed = 300.f;
		//testSetting.startScale = 1.0f;
		//testSetting.endScale = 0.0f; // 서서히 사라짐
		//testSetting.sizeEase = _MathFunc::EaseType::OutQuad;
		//testSetting.airResistance = 2.0f; // 빠르게 감속하며 멈춤

		//testSetting.startColor = _Color::Red;
		//testSetting.endColor = _Color::WhiteSmoke;

		//testSetting.textureKey = Path::Particle + L"Flare_White.png"; // 텍스처 키 설정 (예시)

		//_ParticleService.Emit(testSetting, mouse_pt, 10); // 한 번에 10개 생성
	}

	return UPDATE_CONTINUE;
}

_int StagePlayer::LateUpdate(_double _delta_time)
{
	__super::LateUpdate(_delta_time);

	if (_GameState.debug_mode_)
	{
		_tchar buffer[MAX_PATH] = {};

		swprintf_s(buffer, L"위치 정보 ( x : %.2f | y : %.2f )", transform_->Position().x, transform_->Position().y);
		_Assist.Text(L"플레이어 정보", std::wstring(buffer));

		const auto vel = movement_->GetMoveVelocity();
		swprintf_s(buffer, L"이동량(MoveVelocity) : %.2f, %.2f | %.2f", vel.x, vel.y, vel.Magnitude());
		_Assist.Text(L"플레이어 정보", std::wstring(buffer));

		swprintf_s(buffer, L"HP : %.0f", status_->GetCurrentHp());
		_Assist.Text(L"플레이어 정보", std::wstring(buffer));

		swprintf_s(buffer, L"가속도(Acceleration) : %.f", movement_->GetAcceleration());
		DweTextData data;
		data.text_ = buffer;
		data.font_size_ = 16.f;
		data.color_ = Palette::Blue;
		_Assist.Text(L"플레이어 정보", data);

		_Assist.Text(L"플레이어 정보", std::wstring(L""));

		swprintf_s(buffer, L"마찰 계수(Friction) : %.f", movement_->GetFriction());
		_Assist.Text(L"플레이어 정보", std::wstring(buffer));

		swprintf_s(buffer, L"최대 속도 : %.f", movement_->GetMoveSpdMax());
		_Assist.Text(L"플레이어 정보", std::wstring(buffer));

		_Assist.Text(L"플레이어 정보", std::wstring(L""));
		_Assist.Text(L"플레이어 정보", std::wstring(L"======================== 충돌 리스트 ========================"));
		const auto attack_col = GetDefaultCollider(UnitDefaultColliderId::Attack);
		const auto collideds = attack_col->CollidedColliders();
		for (const auto& collider : collideds)
		{
			swprintf_s(buffer, L"충돌 대상 : %s", collider->GameObject()->Name().c_str());
			_Assist.Text(L"플레이어 정보", std::wstring(buffer));
		}

		//_Assist.Text(L"플레이어 정보", L"==== 충돌 타이머 리스트 ====");
		//const auto timers = attack_col->GetCollisionTimers();
		//for (const auto& pair : timers)
		//{
		//	const auto collider = pair.first;
		//	const auto time = pair.second;
		//	swprintf_s(buffer, L"충돌 대상 : %s | 남은 쿨타임 : %.2f", collider->GameObject()->Name().c_str(), time);
		//	_Assist.Text(L"플레이어 정보", std::wstring(buffer));
		//}
		//_Assist.Text(L"플레이어 정보", L"=====================");

		//for (_uint i = 0; i < 150; ++i)
		//{
		//	_Assist.Text(L"플레이어 정보", std::wstring(L"테스트 밸류 : ") + std::to_wstring(i));
		//}

		//_Assist.Button(
		//	L"플레이어 정보",
		//	L"KillPlayer",
		//	L"▲",
		//	[this]()
		//	{
		//		_SYSTEM_LOG_INFO(L"플레이어 즉사 버튼 클릭");
		//	});
	}

	return UPDATE_CONTINUE;
}

void StagePlayer::OnDestroy()
{
	__super::OnDestroy();

	const auto body_collider = GetDefaultCollider(UnitDefaultColliderId::Body);
	const auto attack_collider = GetDefaultCollider(UnitDefaultColliderId::Attack);
	
	_ColMgr.DeregisterCollider(CollisionLayer::PlayerBody, body_collider);
	_ColMgr.DeregisterCollider(CollisionLayer::PlayerAttack, attack_collider);
	_ColMgr.DeregisterCollider(CollisionLayer::PlayerCollector, collector_col_);

	// 스테이지	매니저에 플레이어가 죽었다는 메시지 보내기
	if (status_->IsDead())
	{
		// 플레이어가 죽으면 게임 전체 일시정지
		_GameState.SetPause(true);
		_RunState.MarkAsPlayerDied();

		// 결과 화면으로 전환
		_StageMgr.ChangeState(StageState::Result);
	}
}

void StagePlayer::OnCollisionEnter(Collider* _this, Collider* _other)
{
	switch (_this->GetLayer())
	{
		/* 몸통 collider 충돌 처리 */
	case CollisionLayer::PlayerBody:
		break;
		/* 공격 collider 충돌 처리 */
	case CollisionLayer::PlayerAttack:
		switch (_other->GetLayer())
		{
		case CollisionLayer::EnemyBody:
			_AttackEnemy(_this, _other);
			break;
		}
		break;
	}
}

void StagePlayer::OnCollisionStay(Collider* _this, Collider* _other)
{
	switch (_this->GetLayer())
	{
		/* 몸통 collider 충돌 처리 */
	case CollisionLayer::PlayerBody:
		break;
		/* 공격 collider 충돌 처리 */
	case CollisionLayer::PlayerAttack:
		switch (_other->GetLayer())
		{
		case CollisionLayer::EnemyBody:
			_AttackEnemy(_this, _other);
			break;
		}
		break;
	}
}

void StagePlayer::GetDamage(_float _damage)
{
	const auto final_damage = combat_->GetDamage(_damage);

	// 데미지 폰트 출력
	const auto position = transform_->Position();
	play_scene_->ShowDamageUI(final_damage, _Point{ position.x, position.y });

	if (status_->IsDead())
	{
		_bool debug = true;
	}
}

void StagePlayer::_AttackEnemy(Collider* _attack_col, Collider* _enemy_body_collider)
{
	const auto target_enemy = _enemy_body_collider->GameObject();
	target_enemy->SendMessageToHandlers(
		HandlerSystemList::Damage,
		[this](IHandler* _handler)
		{
			s_cast(IDamagable*, _handler)->GetDamage(status_->GetAtt());
			_CameraMgr.Shake(2.f, 0.25f);
		}
	);

	const auto status = s_cast(Status*, target_enemy->GetComponent(ComponentType::Status));

	// 공격 속도에 따른 타이머 설정. 플레이어가 공격한 적이 아직 죽지 않았다면, 일정 시간 동안은 같은 적에게 다시 공격하지 않도록 타이머를 설정
	if (!status->IsDead())
	{
		_attack_col->SetTimerForTarget(_enemy_body_collider, DEFAULT_ATTACK_SPEED - info_->attack_speed_);
	}
}
