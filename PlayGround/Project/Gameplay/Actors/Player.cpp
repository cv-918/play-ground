#include "framework.h"
#include "Player.h"

#include "Components/PlayableMovement.h"
#include "GamePlaySystems/SkillManager.h"

#include "GamePlaySystems/Json/ParticleDataManager.h"

Player::~Player()
{
	bool debug = true;
}

_bool Player::Initialize()
{
	if (!__super::Initialize())
		return false;

	// 플레이어 identifier 설정
	Name(_UtilFunc::ToWString(info_->name_));

	// 플레이어 Movement 컴포넌트 생성 및 등록
	movement_ = new PlayableMovement(info_);
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
	attack_col->SetDrawAlways(true); // 공격 콜라이더는 항상 그리도록 설정 (디버그 모드가 아니더라도)
	_ColMgr.RegisterCollider(CollisionLayer::PlayerAttack, attack_col);

	const auto start_collector_size = attribute_stat.GetStat(AttributeType::CollectionRange).GetTotalIncrease(info_->collector_size_); // 수집 콜라이더는 플레이어 크기에 비례해서 설정
	collector_col_ = new SphereCollider(start_collector_size); // 수집 콜라이더는 플레이어 크기에 비례해서 설정
	collector_col_->SetDebugColor(Palette::Gray, Palette::AshGray, Palette::Charcoal);
	collector_col_->SetDrawAlways(true); // 공격 콜라이더는 항상 그리도록 설정 (디버그 모드가 아니더라도)
	RegisterComponent(collector_col_);
	_ColMgr.RegisterCollider(CollisionLayer::PlayerCollector, collector_col_);

	// 기타 멤버 변수 초기화 및 캐싱
	color_ = Palette::DarkGray;
	input_manager_ = &_InputMgr.Get();
	skill_manager_ = &_SkillMgr.Get();

	Finalize();
	return true;
}

_int Player::Update(_double _delta_time)
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

	const auto move_vel = movement_->MoveVelocity();
	if (0 < move_vel.Magnitude())
	{
		_Vector3 test;
		test.operator _Vector2() = move_vel;

		const auto pos = transform_->Position();
		const auto vel = _Vector2{ _Random.Range(-10.f, 10.f), _Random.Range(-5.f, 5.f) };

		ParticleSetting setting;
		_ParticleService.Emit(setting, pos, 1);
	}

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

void Player::DebugRender(_double _delta_time)
{
	__super::DebugRender(_delta_time);

	// s, 디버그 정보 찍기
	if (_GameState.debug_mode_)
		_ShowDebugInfo();
}

void Player::OnDestroy()
{
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

void Player::OnCollisionEnter(Collider* _this, Collider* _other)
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

void Player::OnCollisionStay(Collider* _this, Collider* _other)
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

void Player::GetDamage(_float _damage)
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

void Player::_AttackEnemy(Collider* _attack_col, Collider* _enemy_body_collider)
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

void Player::_ShowDebugInfo()
{
	_tchar buffer[MAX_PATH] = {};

	const _int line_gap = 16;
	const _int draw_pos_x = INGAME_FRAME_THICKNESS;
	_int draw_pos_y = INGAME_FRAME_THICKNESS_HALF - line_gap + 5;

	enum DebugControlDataType
	{
		Acceleration,
		Friction,
		MaxSpeed,
		ContactDamage,
		TypeCount,
	};

	std::vector<std::wstring> labels =
	{
		L"[ 현재 컨트롤 정보 : 1. 가속도 ]",
		L"[ 현재 컨트롤 정보 : 2. 마찰계수 ]",
		L"[ 현재 컨트롤 정보 : 3. 최대속도 ]",
		L"[ 현재 컨트롤 정보 : 4. 충돌 공격력 ]",
	};

	// 1) 디버그 정보 초기화
	debug_info_lines_.clear();

	// 2) 컨트롤할 정보 선택 및 변경
	if (input_manager_->Down(VK_RIGHT))
	{
		++debug_control_data_idx_;

		if (debug_control_data_idx_ >= DebugControlDataType::TypeCount)
		{
			debug_control_data_idx_ = DebugControlDataType::Acceleration;
		}
	}
	else if (input_manager_->Down(VK_LEFT))
	{
		--debug_control_data_idx_;

		if (debug_control_data_idx_ < DebugControlDataType::Acceleration)
		{
			debug_control_data_idx_ = DebugControlDataType::TypeCount - 1;
		}
	}

	switch (debug_control_data_idx_)
	{
	case DebugControlDataType::Acceleration:
		if (input_manager_->Down(VK_DOWN))
		{
			auto acceleration = movement_->Acceleration();
			if (100.f < acceleration)
				movement_->Acceleration() -= 100.f;
		}
		else if (input_manager_->Down(VK_UP))
		{
			movement_->Acceleration() += 100.f;
		}
		break;
	case DebugControlDataType::Friction:
		if (input_manager_->Down(VK_DOWN))
		{
			auto friction = movement_->Friction();
			if (1 < friction)
				--movement_->Friction();
		}
		else if (input_manager_->Down(VK_UP))
		{
			++movement_->Friction();
		}
		break;
	case DebugControlDataType::MaxSpeed:
		if (input_manager_->Down(VK_DOWN))
		{
			auto move_spd_max = movement_->MoveSpdMax();
			if (100.f < move_spd_max)
			{
				move_spd_max -= 100.f;
				movement_->MoveSpdMax(move_spd_max);
			}
		}
		else if (input_manager_->Down(VK_UP))
		{
			auto move_spd_max = movement_->MoveSpdMax();
			movement_->MoveSpdMax(move_spd_max + 100.f);
		}
		break;
	case DebugControlDataType::ContactDamage:
		if (input_manager_->Down(VK_DOWN))
		{
			auto damage = status_->GetAtt();
			if (1.f < damage)
				status_->SetAtt(damage - 1.f);
		}
		else if (input_manager_->Down(VK_UP))
		{
			status_->SetAtt(status_->GetAtt() + 1.f);
		}
		break;
	}

	// 3) 디버그 정보 라인 추가
	debug_info_lines_.emplace_back(labels[debug_control_data_idx_]);

	swprintf_s(buffer, L"위치 정보 ( x : %.2f | y : %.2f )", transform_->Position().x, transform_->Position().y);
	debug_info_lines_.emplace_back(buffer);

	swprintf_s(buffer, L"이동량(MoveVelocity) : %.2f, %.2f", movement_->MoveVelocity().x, movement_->MoveVelocity().y);
	debug_info_lines_.emplace_back(buffer);

	swprintf_s(buffer, L"HP : %.0f", status_->GetCurrentHp());
	debug_info_lines_.emplace_back(buffer);

	swprintf_s(buffer, L"가속도(Acceleration) : %.f", movement_->Acceleration());
	debug_info_lines_.emplace_back(buffer);

	debug_info_lines_.emplace_back(L"");

	swprintf_s(buffer, L"마찰 계수(Friction) : %.f", movement_->Friction());
	debug_info_lines_.emplace_back(buffer);

	swprintf_s(buffer, L"최대 속도 : %.f", movement_->MoveSpdMax());
	debug_info_lines_.emplace_back(buffer);

	swprintf_s(buffer, L"접촉 공격력 : %d", status_->GetAtt());
	debug_info_lines_.emplace_back(buffer);

	debug_info_lines_.emplace_back(L"");
	debug_info_lines_.emplace_back(L"==== 충돌 리스트 ====");
	const auto attack_col = GetDefaultCollider(UnitDefaultColliderId::Attack);
	const auto collideds = attack_col->CollidedColliders();
	for(const auto& collider : collideds)
	{
		swprintf_s(buffer, L"충돌 대상 : %s", collider->GameObject()->Name().c_str());
		debug_info_lines_.emplace_back(buffer);
	}

	debug_info_lines_.emplace_back(L"==== 충돌 타이머 리스트 ====");
	const auto timers = attack_col->GetCollisionTimers();
	for (const auto& pair : timers)
	{
		const auto collider = pair.first;
		const auto time = pair.second;
		swprintf_s(buffer, L"충돌 대상 : %s | 남은 쿨타임 : %.2f", collider->GameObject()->Name().c_str(), time);
		debug_info_lines_.emplace_back(buffer);
	}
	debug_info_lines_.emplace_back(L"=====================");

	// 4) 디버그 정보 그리기
	for (const auto& line : debug_info_lines_)
		_DrawFunc::DrawString(_Point{ draw_pos_x, draw_pos_y += line_gap }, line, Palette::Black, 12.f, false);
}
