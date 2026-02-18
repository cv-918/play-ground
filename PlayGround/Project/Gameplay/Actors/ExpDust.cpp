#include "framework.h"
#include "ExpDust.h"

#include "Systems/Physics/CollisionManager.h"

#include "Core/Math/Random.h"

#include "Components/Transform.h"
#include "Components/Status.h"
#include "Components/Movement.h"
#include "Components/SphereCollider.h"
#include "Components/Combat.h"

_bool ExpDust::Initialize()
{
	if (!__super::Initialize())
		return false;

	// 더스트 identifier 설정
	static _int instance_count = 0;
	Name(_T("ExpDust") + std::to_wstring(++instance_count));

	// 더스트 초기값 설정
	const auto lv = _Random.Range(1, 5);

	_float scale = 10.f; // 기본 크기
	_float move_spd = 0.f; // 기본 이동 속도
	
	_int move_pattern = 0; // 이동 패턴 (0: 정지, 1: 랜덤 방향으로 이동, 2: 플레이어를 향해 이동 등)
	_int move_pattern_change_interval = 0; // 이동 패턴 변경 간격 (초 단위)
	_int move_pattern_timer = 0; // 이동 패턴 타이머
	
	// 무브먼트 타입 설정해서 가속도 로직으로 이동할지 일반 로직으로 이동할지 선택
	switch (lv)
	{
	case 1:
		break;
	case 2:
		break;
	case 3:
		scale = 30.f;
		break;
	case 4:
		scale = 50.f;
		break;
	case 5:
		scale = 80.f;
		break;
	default:
		break;
	}

	transform_->Rotation(0, 1);
	transform_->Scale(scale);

	// 랜덤 색상 설정
	// RGB(100~255 범위의 랜덤한 색상)
	// 추후에는 레벨에 따른 색상 범위 설정도 고려
	const _int color_range_min = 100;
	const _int color_range_max = 255;
	color_brush_ = CreateSolidBrush(RGB(
		_Random.Range(color_range_min, color_range_max),
		_Random.Range(color_range_min, color_range_max),
		_Random.Range(color_range_min, color_range_max)
	));

	// 더스트 컴포넌트 설정
	collider_ = new SphereCollider(scale * 0.5f);
	collider_->Draw(false);

	movement_ = new Movement();

	combat_ = new Combat();

	status_ = new Status();
	status_->Level(lv);

	RegisterComponent(collider_);
	_ColMgr.RegisterCollider(CollisionLayer::ExpDust, collider_);

	return _bool();
}

_int ExpDust::Update(_double _delta_time)
{
	_int ret = __super::Update(_delta_time);
	if (0 != ret) return ret;

	return 0;
}

void ExpDust::Render(_double _delta_time)
{
	if(!IsVisible())
		return;

	__super::Render(_delta_time);

	//HBRUSH hollowBrush = (HBRUSH)GetStockObject(color_brush_);
	HBRUSH oldBrush = (HBRUSH)SelectObject(back_dc_, color_brush_);

	const auto pos = transform_->Position();
	const _int rt_size = transform_->Scale().Length();

	RECT rt = {
		pos.x - rt_size,
		pos.y - rt_size,
		pos.x + rt_size,
		pos.y + rt_size
	};

	Ellipse(back_dc_, rt.left, rt.top, rt.right, rt.bottom);
	SelectObject(back_dc_, oldBrush);
}

void ExpDust::DebugRender(double _delta_time)
{
	__super::DebugRender(_delta_time);

	// 1. 배경 모드를 투명(TRANSPARENT)으로 설정
	int oldMode = SetBkMode(back_dc_, TRANSPARENT);

	const auto pos = transform_->Position();
	const auto rt_size = 150;
	const auto half_size = rt_size >> 1;

	RECT rt;
	rt.left = pos.x - half_size;
	rt.top = pos.y - half_size + 14;
	rt.right = pos.x + half_size;
	rt.bottom = pos.y + half_size + 14;

	// s, 오브젝트 이름 그리기
	const auto debug_string_level = std::wstring(_T("(Lv : ")) + std::to_wstring(status_->Level()) + std::wstring(_T(")"));
	DrawText(back_dc_, debug_string_level.c_str(), debug_string_level.length(), &rt, DT_SINGLELINE | DT_CENTER | DT_VCENTER);
	// e, 오브젝트 이름 그리기

	// 3. (선택 사항) 다음 그림을 위해 이전 모드로 복구
	SetBkMode(back_dc_, oldMode);
}

void ExpDust::OnCollisionEnter(Collider* _this, Collider* _other)
{
	switch (_other->Layer())
	{
	case CollisionLayer::PlayerBody:
		if (status_->Level() >= 4)
		{
			const auto player = _other->GameObject();

			// 플레이어의 Combat 컴포넌트에서 GetDamage() 호출해서 데미지 입히기
			const auto com_combat = player->GetComponent(ComponentType::Combat);
			s_cast(Combat*, com_combat)->GetDamage(1);

			// 공격속도 고정값 일단은 여기에 지역변수로 하드코딩
			const _double attack_speed = 4.f;

			// 플레이어에 대한 충돌 기록 저장
			_this->SetTimerForTarget(_other, attack_speed);
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

}

void ExpDust::AdjustColliderRadius()
{
	if (collider_)
	{
		collider_->Radius(transform_->Scale().Length());
	}
}
