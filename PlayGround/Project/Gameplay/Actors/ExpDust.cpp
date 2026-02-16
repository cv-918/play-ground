#include "framework.h"
#include "ExpDust.h"

#include "Systems/Physics/CollisionManager.h"

#include "Core/Math/Random.h"

#include "Components/SphereCollider.h"
#include "Components/Transform.h"
#include "Components/Combat.h"

_bool ExpDust::Initialize()
{
	if (!__super::Initialize())
		return false;

	static _int instance_count = 0;
	instance_count++;
	ExpDust::Name(_T("ExpDust") + std::to_wstring(instance_count));

	collider_ = new SphereCollider(5.f);
	collider_->Draw(false);

	RegisterComponent(collider_);
	_ColMgr.RegisterCollider(CollisionLayer::ExpDust, collider_);

	color_brush_ = _Random.Range(WHITE_BRUSH, BLACK_BRUSH);
	if (WHITE_BRUSH == color_brush_)
		is_white_ = true;

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

	HBRUSH hollowBrush = (HBRUSH)GetStockObject(color_brush_);
	HBRUSH oldBrush = (HBRUSH)SelectObject(back_dc_, hollowBrush);

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

void ExpDust::OnCollisionEnter(Collider* _this, Collider* _other)
{
	switch (_other->Layer())
	{
	case CollisionLayer::PlayerBody:
		if (is_white_)
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
