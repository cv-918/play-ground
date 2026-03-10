#include "framework.h"
#include "Player.h"

#include "Components/PlayableMovement.h"
#include "GamePlaySystems/StageManager.h"

_bool Player::Initialize()
{
	if (!__super::Initialize())
		return false;

	// 플레이어 identifier 설정
	std::wstring_convert<std::codecvt_utf8<wchar_t>> converter;
	Name(converter.from_bytes(info_->name_));

	// 플레이어 Movement 컴포넌트 생성 및 등록
	movement_ = new PlayableMovement(info_);
	RegisterComponent(movement_);

	// 플레이어 컴포넌트 설정
	transform_->Rotation(0, 1);
	transform_->Scale(30.f);

	status_->SetCurrentHp(info_->hp_);
	status_->SetMaxHP(info_->hp_);
	status_->SetAtt(info_->contact_damage_);

	// 플레이어 콜라이더 설정
	_int default_collider_idx = s_int(UnitDefaultColliderId::Body) - 1;
	player_col_size_[++default_collider_idx] = 15.f;
	GetDefaultCollider(UnitDefaultColliderId::Body)->Radius(player_col_size_[default_collider_idx]);
	_ColMgr.RegisterCollider(CollisionLayer::PlayerBody, s_cast(SphereCollider*, GetComponent(ComponentType::Collider, default_collider_idx)));

	player_col_size_[++default_collider_idx] = 25.f;
	GetDefaultCollider(UnitDefaultColliderId::Attack)->Radius(player_col_size_[default_collider_idx]);
	_ColMgr.RegisterCollider(CollisionLayer::PlayerAttack, s_cast(SphereCollider*, GetComponent(ComponentType::Collider, default_collider_idx)));

	// 기타 멤버 변수 초기화 및 캐싱
	color_ = Colors::DarkGray;
	input_manager_ = &_InputMgr.Get(); // 매 프레임마다 Get 호출하는 것을 피하기 위해서

	Finalize();
	return true;
}

_int Player::Update(_double _delta_time)
{
	_int ret = __super::Update(_delta_time);
	if (0 != ret) return ret;

	return 0;
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

	// 스테이지	매니저에 플레이어가 죽었다는 메시지 보내기
	_StageMgr.OnPlayerDeath();
}

void Player::OnCollisionEnter(Collider* _this, Collider* _other)
{
	switch (_this->Layer())
	{
	case CollisionLayer::PlayerBody:
		// 몸통 collider 충돌 처리
		break;
	case CollisionLayer::PlayerAttack:
	{
		// 공격 collider 충돌 처리
		switch (_other->Layer())
		{
		case CollisionLayer::EnemyBody:
		{
			// 더스트의 IDamagable 핸들러 시스템에 메시지 보내서 데미지 입히기
			_other->GameObject()->SendMessageToHandlers(HandlerSystemList::Damage, [this](IHandler* _handler) {
				s_cast(IDamagable*, _handler)->GetDamage(status_->GetAtt());
				});

			// 공격 쿨타임 동안은 같은 더스트에 대해서는 충돌이 일어나지 않도록 타이머 설정
			// 공격속도 고정값 일단은 여기에 지역변수로 하드코딩
			const _double attack_cooltime = 1.f;
			_this->SetTimerForTarget(_other, attack_cooltime);

			break;
		}
		}

		break;
	}
	}
}

void Player::OnCollisionStay(Collider* _this, Collider* _other)
{
	switch (_this->Layer())
	{
	case CollisionLayer::PlayerBody:
		// 몸통 collider 충돌 처리
		break;
	case CollisionLayer::PlayerAttack:
	{
		// 공격 collider 충돌 처리
		switch (_other->Layer())
		{
		case CollisionLayer::EnemyBody:
		{
			// 더스트의 IDamagable 핸들러 시스템에 메시지 보내서 데미지 입히기
			_other->GameObject()->SendMessageToHandlers(HandlerSystemList::Damage, [this](IHandler* _handler) {
				s_cast(IDamagable*, _handler)->GetDamage(status_->GetAtt());
				});

			// 공격 쿨타임 동안은 같은 더스트에 대해서는 충돌이 일어나지 않도록 타이머 설정
			// 공격속도 고정값 일단은 여기에 지역변수로 하드코딩
			const _double attack_cooltime = 1.f;
			_this->SetTimerForTarget(_other, attack_cooltime);

			break;
		}
		}

		break;
	}
	}
}

void Player::GetDamage(_float _damage)
{
	const auto final_damage = combat_->GetDamage(_damage);

	// 데미지 폰트 출력
	const auto position = transform_->Position();
	play_scene_->ShowDamageUI(final_damage, _Point{ position.x, position.y });
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

	swprintf_s(buffer, L"이동량(MoveVelocity) : %.2f", movement_->MoveVelocity().Magnitude());
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

	// 4) 디버그 정보 그리기
	for (const auto& line : debug_info_lines_)
		_DrawFunc::DrawString(_Point{ draw_pos_x, draw_pos_y += line_gap }, line, Colors::Black, 12.f, false);
}
