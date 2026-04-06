#include "framework.h"
#include "EllipseCollider.h"

#include "Actors/GameObjectBase.h"
#include "Transform.h"
#include "RectCollider.h"
#include "SphereCollider.h"

_int EllipseCollider::LateUpdate(_double _delta_time)
{
	if (!IsEnable())
		return UPDATE_CONTINUE;

	// 캐릭터의 발밑을 중심으로 설정 (피봇 조절)
	_Vector3 pos = transform_->Position();
	// 타원의 높이 절반만큼 위로 올려서 중심 잡기 (시각적 일치감)
	//pos.y -= (radius_x_ * y_ratio_);
	center_ = _CameraMgr.WorldToScreen(pos);

	return UPDATE_CONTINUE;
}

void EllipseCollider::Render(_double _delta_time)
{
	if (!IsVisible())
		return;

	if (!IsDrawAlways() && !_GameState.debug_mode_)
		return;

	_Point lt = { s_int(center_.x - radius_x_), s_int(center_.y - radius_y_) };
	_float width = radius_x_ * 2.0f;
	_float height = radius_y_ * 2.0f;

	_DrawFunc::DrawEllipse({ lt, _Size{ width, height } }, color_[s_int(IsColliding() ? 2 : 1)], 1.75f);
}

_bool EllipseCollider::CheckCollided(Collider* _other)
{
	if (!_other) return false;

	const auto other_type = _other->GetType();
	switch (other_type)
	{
	case ColliderType::Sphere: // 상대방이 Sphere(정원)인 경우
	{
		SphereCollider* other = s_cast(SphereCollider*, _other);
		_Vector3 otherPos = other->GetCenter();
		_float otherRadius = other->GetRadius();

		// [유저님 검증 완료 식]
		_float diffX = otherPos.x - center_.x;
		_float diffY = (otherPos.y - center_.y) / y_ratio_; // 내 타원 비율로 Y축 확장

		_float distSq = (diffX * diffX) + (diffY * diffY);

		// 상대 반지름도 내 타원의 '원형 변환 공간'에 맞춰 보정해서 더해줍니다.
		_float combinedRadius = radius_x_ + (otherRadius / y_ratio_);

		return distSq <= (combinedRadius * combinedRadius);
	}

	case ColliderType::Rectangle: // 상대방이 Rect인 경우
	{
		const auto rect_collider = s_cast(RectCollider*, _other);
		const auto rt = rect_collider->Rect();

		// 1. 사각형 내 가장 가까운 점 찾기
		_float closestX = std::max(rt.Left_f(), std::min(center_.x, rt.Right_f()));
		_float closestY = std::max(rt.Top_f(), std::min(center_.y, rt.Bottom_f()));

		// 2. 해당 점을 내 타원 공간으로 보정해서 거리 재기
		_float diffX = closestX - center_.x;
		_float diffY = (closestY - center_.y) / y_ratio_;

		_float distSq = (diffX * diffX) + (diffY * diffY);
		return distSq <= (radius_x_ * radius_x_);
	}

	case ColliderType::Ellipse: // 상대방도 Ellipse인 경우
	{
		//EllipseCollider* other = s_cast(EllipseCollider*, _other);
		//_Vector3 otherPos = other->GetCenter();

		//_float diffX = otherPos.x - center_.x;
		//// 서로 납작함이 다를 수 있으므로, 내 기준(yRatio)으로 공간을 통합합니다.
		//_float diffY = (otherPos.y - center_.y) / y_ratio_;

		//// 상대의 X 반지름과 보정된 Y 반지름 중 큰 값을 기준으로 근사치 계산
		//_float otherSizeInMySpace = other->GetRadiusX();
		//_float combinedRadius = radius_x_ + otherSizeInMySpace;

		//_float distSq = (diffX * diffX) + (diffY * diffY);
		//return distSq <= (combinedRadius * combinedRadius);

		EllipseCollider* other = s_cast(EllipseCollider*, _other);
		_Vector3 otherPos = other->GetCenter();

		_float diffX = otherPos.x - center_.x;
		// 1. 내 yRatio 기준으로 Y축 거리를 보정 (세상을 원형으로 펴기)
		_float correctedDiffY = (otherPos.y - center_.y) / y_ratio_;

		// 2. [핵심] 상대방의 타원도 내 공간(원형 세상)으로 가져와야 합니다.
		// 상대방의 가로 반지름은 그대로지만, 
		// 상대방의 세로 반지름(other->radiusX * other->yRatio)도 
		// 나의 yRatio에 의해 "나누어져서" 보정되어야 합니다.

		_float myRyInMySpace = radius_x_; // 나는 이미 원이 됨

		// 상대방의 세로 반지름을 내 공간의 비율로 환산
		_float otherRyInMySpace = (other->GetRadiusX() * other->GetYRatio()) / y_ratio_;

		// 가로와 세로 중 더 큰 영향력을 가진 쪽을 선택하거나, 평균을 사용합니다.
		// 가장 안전한 방법은 상대방의 가로 반지름을 그대로 쓰는 것입니다 (내 세상에선 가로가 기준이므로).
		_float otherSizeInMySpace = other->GetRadiusX();

		_float combinedRadius = radius_x_ + otherSizeInMySpace;

		_float distSq = (diffX * diffX) + (correctedDiffY * correctedDiffY);
		return distSq <= (combinedRadius * combinedRadius);
	}
	}

	return false;

	//if (!_other) return false;

	//// 상대방이 원(Sphere)일 경우의 판정 예시
	//if (_other->GetType() == ColliderType::Sphere)
	//{
	//	// SphereCollider*로 캐스팅하여 상대 중심 좌표 가져오기
	//	// (실제 프로젝트 구조에 따라 GetCenter 함수 호출 필요)
	//	_Vector3 otherPos = _other->GameObject()->GetTransform()->Position();

	//	_float diffX = otherPos.x - center_.x;
	//	_float diffY = (otherPos.y - center_.y) / y_ratio_; // Y축 보정

	//	_float distSq = (diffX * diffX) + (diffY * diffY);
	//	return distSq <= (radius_x_ * radius_x_);


	//	//SphereCollider* other = s_cast(SphereCollider*, _other);
	//	//_Vector3 otherPos = other->GetCenter();
	//	//_float otherRadius = other->GetRadius();

	//	//// [핵심 보정 식]
	//	//// 타원의 세로가 가로의 yRatio배(예: 0.5)라면, 
	//	//// 거리를 잴 때 Y축 차이값을 yRatio로 나누어 "가상으로 늘려줍니다".
	//	//_float diffX = otherPos.x - center_.x;
	//	//_float diffY = (otherPos.y - center_.y) / y_ratio_;

	//	//// 상대방 원의 반지름도 Y축 방향으로 찌그러져 있으므로, 
	//	//// 타원 입장(가로 기준)에서는 상대방 반지름이 '확장'된 것으로 취급해야 정확합니다.
	//	//// 하지만 계산 편의상 "내 가로 반지름"과 "상대 원 반지름"의 합을 기준으로 삼습니다.
	//	//_float combinedRadius = radius_x_ + otherRadius;

	//	//_float distSq = (diffX * diffX) + (diffY * diffY);

	//	//return distSq <= (combinedRadius * combinedRadius);


	//	//SphereCollider* other = s_cast(SphereCollider*, _other);
	//	//_Vector3 otherPos = other->GetCenter();
	//	//_float otherRadius = other->GetRadius();

	//	//// 1. 위치 차이를 구함
	//	//_float diffX = otherPos.x - center_.x;
	//	//_float diffY = otherPos.y - center_.y;

	//	//// 2. [가장 중요한 지점] 
	//	//// Y축 방향의 거리만 'yRatio'로 나누어 압축 전(정원 상태)으로 되돌립니다.
	//	//// 나도 정원이 되고, 상대방 Sphere도 사실상 '바닥 원'이므로 동일한 보정을 받습니다.
	//	//_float correctedDiffY = diffY / y_ratio_;

	//	//// 3. 이제 두 객체 모두 '원'이 된 가상 공간이므로
	//	//// 반지름의 합과 보정된 거리의 제곱을 비교합니다.
	//	//_float combinedRadius = radius_x_ + otherRadius;

	//	//_float distSq = (diffX * diffX) + (correctedDiffY * correctedDiffY);

	//	//return distSq <= (combinedRadius * combinedRadius);


	//	//SphereCollider* other = s_cast(SphereCollider*, _other);
	//	//_Vector3 otherPos = other->GetCenter();
	//	//_float otherRadius = other->GetRadius();

	//	//// 1. 위치 차이
	//	//_float diffX = otherPos.x - center_.x;
	//	//_float diffY = otherPos.y - center_.y;

	//	//// 2. [교정된 핵심 식] 
	//	//// 상대는 정원이므로, "나의 납작함"에 맞춰서 "상대의 위치"를 보정하는 게 아니라
	//	//// "나의 타원 방정식" 안에 "상대의 원"이 걸치는지 확인해야 합니다.

	//	//// 타원 공식: (x/rx)^2 + (y/ry)^2 <= 1
	//	//// 이를 원의 거리 공식처럼 쓰려면: x^2 + (y / yRatio)^2 <= radiusX^2

	//	//// 하지만 상대방도 '반지름'이 있으므로, 
	//	//// 상대방의 원을 '나의 타원 공간'으로 가져와서 계산해야 합니다.

	//	//_float Ry = radius_x_ * y_ratio_; // 나의 세로 반지름

	//	//// Minkowski Sum(충돌 반경 합산)의 타원 버전 근사치
	//	//_float combinedRx = radius_x_ + otherRadius;
	//	//_float combinedRy = Ry + otherRadius;

	//	//// 최종 판정 (타원 방정식)
	//	//_float term1 = (diffX * diffX) / (combinedRx * combinedRx);
	//	//_float term2 = (diffY * diffY) / (combinedRy * combinedRy);

	//	//return (term1 + term2) <= 1.0f;
	//}

	//return false;
}
