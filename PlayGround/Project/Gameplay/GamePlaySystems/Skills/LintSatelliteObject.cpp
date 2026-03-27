#include "framework.h"
#include "LintSatelliteObject.h"

#include "Components/SphereCollider.h"
#include "Components/Status.h"
#include "EngineSystems/Physics/CollisionManager.h"

_bool LintSatelliteObject::Initialize()
{
	if (!__super::Initialize())
		return false;

	// JSON 데이터 기반 초기화
	// 보풀 뭉치 자체의 크기 (임의로 30.f 설정, 필요시 JSON에 규격 추가 권장)
	transform_->Scale(skill_info_->proj_size_);

	color_ = Colors::Rust;
	color_.a >>= 1;

	// 시작 각도 설정 (CreationInfo의 LookPoint 등을 활용하거나 외부에서 주입)
	// 여기서는 단순하게 생성 시점의 좌표를 기반으로 초기 각도를 계산하거나 랜덤 부여 가능
	start_angle_offset_ = _MathFunc::ToRadian(creation_info_.look_point_.x);

	collider_ = new SphereCollider(skill_info_->proj_size_ * 0.5f);
	RegisterComponent(collider_);

	_ColMgr.RegisterCollider(CollisionLayer::PlayerAttack, collider_);

	life_timer_ = skill_info_->duration_;

	Finalize();
	return true;
}

_int LintSatelliteObject::Update(_double _delta_time)
{
	auto ret = __super::Update(_delta_time);
	if (UPDATE_CONTINUE != ret)
		return ret;

	// 수명 체크
	life_timer_ -= _delta_time;
	if (life_timer_ <= 0.0)
	{
		ReserveDestruction();
		return UPDATE_BREAK;
	}

	// 회전 각도 업데이트 (proj_speed를 각속도로 활용)
	current_angle_ += s_float(skill_info_->proj_speed_ * _delta_time);

	return UPDATE_CONTINUE;
}

_int LintSatelliteObject::LateUpdate(_double _delta_time)
{
	auto ret = __super::LateUpdate(_delta_time);
	if (UPDATE_CONTINUE != ret)
		return ret;

	// 플레이어(owner_)를 중심으로 회전 위치 계산
	const auto owner_pos = creation_info_.owner_->GetTransform()->Position();
	const _float radius = skill_info_->area_of_effect_;
	const _float total_angle = start_angle_offset_ + _MathFunc::ToRadian(current_angle_);

	_Vector3 new_pos;
	new_pos.x = owner_pos.x + cosf(total_angle) * radius;
	new_pos.y = owner_pos.y + sinf(total_angle) * radius;
	new_pos.z = owner_pos.z;

	transform_->Position(new_pos);

	return UPDATE_CONTINUE;
}

void LintSatelliteObject::OnCollisionEnter(Collider* _this, Collider* _other)
{
	if (_other->GetLayer() == CollisionLayer::EnemyBody)
		AttackEnemy(_this, _other);
}

void LintSatelliteObject::OnCollisionStay(Collider* _this, Collider* _other)
{
	if (_other->GetLayer() == CollisionLayer::EnemyBody)
		AttackEnemy(_this, _other);
}

void LintSatelliteObject::AttackEnemy(Collider* _attack_col, Collider* _enemy_body_collider)
{
	const auto target_enemy = _enemy_body_collider->GameObject();

	target_enemy->SendMessageToHandlers(
		HandlerSystemList::Damage,
		[this](IHandler* _handler) {
			s_cast(IDamagable*, _handler)->GetDamage(skill_info_->flat_damage_);
		}
	);

	const auto status = s_cast(Status*, target_enemy->GetComponent(ComponentType::Status));
	if (status && !status->IsDead())
	{
		// JSON의 dot_interval_ (0.5초) 주기로 동일 타겟 재공격 타이머 설정
		_attack_col->SetTimerForTarget(_enemy_body_collider, skill_info_->dot_interval_);
	}
}