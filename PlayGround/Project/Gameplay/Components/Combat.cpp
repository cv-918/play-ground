#include "framework.h"
#include "Combat.h"

#include "Actors/GameObjectBase.h"

void Combat::GetDamage(const _int _damage)
{
	// 방어 코드: 데미지가 음수인 경우 무시
	if (_damage < 0)
		return;

	// 방어 코드: 이미 체력이 0인 경우 무시
	if (hp_ <= 0)
		return;

	// 데미지 계산 코드: 공격력, 방어력, 기타 버프/디버프 등을 고려한 최종 데미지 계산
	// 예시로, 단순히 공격력에서 방어력을 뺀 값을 데미지로 계산한다고 가정
	// 추후에 헬퍼함수로 분리하거나, 데미지 계산 로직을 별도의 시스템으로 옮길 수 있음
	auto input_damage = _damage;
	auto final_damage = input_damage;

	// 체력에서 데미지만큼 감소
	hp_ -= final_damage;

	// TODO: 피격 이펙트, 사운드 등 추가

	// 만약 체력이 0 이하라면 소멸 처리
	// 현재는 InActive()로 처리하지만, 추후에 사망 애니메이션 재생 후 소멸하는 로직으로 변경할 수 있음
	// 또한, 체력이 0 이하로 떨어지는 경우에 대한 이벤트나 콜백을 추가해서 다른 시스템과 연동할 수도 있음
	
	// 일괄처리 시스템을 구현 후 Combat 시스템에서 체력 0 이하인 경우에 대한 처리를 일괄처리 시스템으로 위임하는 방식으로 변경해야함
	if(hp_ <= 0)
	{
		hp_ = 0;
		gameobject_->InActivate();
	}
}
